import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { WebhookEvent, UserJSON, DeletedObjectJSON } from '@clerk/nextjs/server';
import User from '@/lib/models/User';
import { connectToDatabase } from '@/lib/db';

/**
 * Helper function to extract primary email from Clerk user data
 */
function getPrimaryEmail(userData: UserJSON) {
  const primaryEmail = userData.email_addresses?.find(
    (email) => email.id === userData.primary_email_address_id
  );

  if (!primaryEmail) {
    throw new Error('No primary email address found for user');
  }

  return primaryEmail;
}

/**
 * Clerk Webhook Handler
 *
 * Processes webhooks from Clerk for user lifecycle events:
 * - user.created: Create new user in MongoDB
 * - user.updated: Update existing user data
 * - user.deleted: Handle user deletion
 */

export async function POST(req: NextRequest) {
  try {
    // Get the headers
    const headersList = await headers();
    const svix_id = headersList.get('svix-id');
    const svix_timestamp = headersList.get('svix-timestamp');
    const svix_signature = headersList.get('svix-signature');

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        { error: 'Missing required webhook headers' },
        { status: 400 }
      );
    }

    // Get the body
    const body = await req.text();

    // Get the webhook secret from environment
    const webhook_secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhook_secret) {
      console.error('Missing CLERK_WEBHOOK_SECRET environment variable');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create a new Svix instance with the webhook secret
    const wh = new Webhook(webhook_secret);

    let evt: WebhookEvent;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error('Error verifying webhook signature:', err);
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    // Connect to database
    try {
      await connectToDatabase();
    } catch (error) {
      console.error('Database connection failed:', error);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Handle the webhook event
    const eventType = evt.type;
    console.log(`Processing Clerk webhook: ${eventType} for user ${evt.data.id}`);

    try {
      switch (eventType) {
        case 'user.created':
          await handleUserCreated(evt.data);
          break;

        case 'user.updated':
          await handleUserUpdated(evt.data);
          break;

        case 'user.deleted':
          await handleUserDeleted(evt.data);
          break;

        default:
          console.log(`Unhandled webhook event type: ${eventType}`);
          return NextResponse.json(
            { message: 'Event type not handled' },
            { status: 200 }
          );
      }

      return NextResponse.json(
        { message: 'Webhook processed successfully' },
        { status: 200 }
      );
    } catch (error) {
      console.error(`Error processing webhook ${eventType}:`, error);
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in webhook handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle user.created webhook event
 */
async function handleUserCreated(userData: UserJSON) {
  console.log('Creating user from Clerk webhook:', userData.id);

  // Extract primary email address
  const primaryEmail = getPrimaryEmail(userData);

  // Map Clerk data to our user format
  const clerkUserData = {
    clerkId: userData.id,
    email: primaryEmail.email_address,
    firstName: userData.first_name || undefined,
    lastName: userData.last_name || undefined,
    username: userData.username || undefined,
    imageUrl: userData.image_url,
    emailVerified: primaryEmail.verification?.status === 'verified',
  };

  // Create user in our database
  const user = await User.createClerkUser(clerkUserData);
  console.log(`User created successfully: ${user._id}`);

  return user;
}

/**
 * Handle user.updated webhook event
 */
async function handleUserUpdated(userData: UserJSON) {
  console.log('Updating user from Clerk webhook:', userData.id);

  // Extract primary email address
  const primaryEmail = getPrimaryEmail(userData);

  // Map Clerk data to our user format
  const clerkUserData = {
    clerkId: userData.id,
    email: primaryEmail.email_address,
    firstName: userData.first_name || undefined,
    lastName: userData.last_name || undefined,
    username: userData.username || undefined,
    imageUrl: userData.image_url,
    emailVerified: primaryEmail.verification?.status === 'verified',
  };

  // Update user in our database
  const user = await User.updateFromClerkData(userData.id, clerkUserData);
  console.log(`User updated successfully: ${user._id}`);

  return user;
}

/**
 * Handle user.deleted webhook event
 */
async function handleUserDeleted(userData: DeletedObjectJSON) {
  console.log('Handling user deletion from Clerk webhook:', userData.id);

  if (!userData.id) {
    console.error('No user ID provided for deletion');
    return;
  }

  const user = await User.findByClerkId(userData.id);
  if (!user) {
    console.warn(`User not found for deletion: ${userData.id}`);
    return;
  }

  // For now, we'll do a soft delete by updating the sync status
  // In the future, you might want to implement a proper deletion strategy
  user.syncStatus = 'error';
  user.lastClerkSync = new Date();
  await user.save();

  console.log(`User marked as deleted: ${user._id}`);
  return user;
}