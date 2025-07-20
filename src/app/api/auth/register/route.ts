import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { UserService } from '@/lib/services/UserService';
import { userRegistrationSchema } from '@/lib/validations/user';
import { connectToDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Ensure database connection is established
    await connectToDatabase();

    const body = await request.json();

    // Validate the request body
    const validatedData = userRegistrationSchema.parse(body);

    // Create the user
    const result = await UserService.createUser(validatedData);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error?.message || 'Registration failed',
          errors: result.error?.details || [
            { field: '', message: result.error?.message || 'Unknown error' },
          ],
        },
        { status: result.error?.statusCode || 400 }
      );
    }

    // Return the user data (sensitive fields already removed by service)
    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        user: result.data?.user,
        emailBypass: result.data?.emailBypass,
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
