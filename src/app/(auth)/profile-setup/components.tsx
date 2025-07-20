import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  FormWrapper,
  FormInput,
  FormSelect,
  FormSubmitButton,
} from '@/components/forms';
import { TIMEZONE_OPTIONS, EXPERIENCE_LEVEL_OPTIONS, PRIMARY_ROLE_OPTIONS } from './constants';

type LoadingStateProps = {
  // No props needed
};

export function LoadingState({}: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    </div>
  );
}

type SuccessStateProps = {
  // No props needed
};

export function SuccessState(_props: SuccessStateProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Profile Setup Complete!</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Welcome to D&D Encounter Tracker! Your profile has been set up successfully.
        </p>
        <div className="pt-2">
          <Button onClick={() => router.push('/dashboard' as any)}>
            Continue to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

type ProfileFormData = {
  displayName: string;
  timezone: string;
  dndEdition: string;
  experienceLevel: string;
  primaryRole: string;
};

type ProfileFormProps = {
  formData: ProfileFormData;
  updateField: (_field: keyof ProfileFormData, _value: string) => void;
  handleSubmit: (_event: React.FormEvent<HTMLFormElement>) => void;
  handleSkip: () => void;
  getFieldError: (_field: string) => string | undefined;
  isSubmitting: boolean;
  errors: Array<{ field: string; message: string }>;
};

function ProfileFormHeader() {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <Avatar className="w-16 h-16">
          <AvatarFallback>
            <User className="h-8 w-8" />
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Complete Your Profile</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Help us personalize your D&D Encounter Tracker experience
        </p>
      </div>
    </div>
  );
}

function ProfileFormFields({ formData, updateField, getFieldError }: {
  formData: ProfileFormData;
  updateField: (_field: keyof ProfileFormData, _value: string) => void;
  getFieldError: (_field: string) => string | undefined;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Display Name"
          placeholder="How should we display your name?"
          value={formData.displayName}
          onChange={(e) => updateField('displayName', e.target.value)}
          error={getFieldError('displayName')}
          helperText="This is how others will see your name in shared encounters"
        />
        <FormSelect
          label="Timezone"
          options={TIMEZONE_OPTIONS}
          value={formData.timezone}
          onValueChange={(value) => updateField('timezone', value)}
          error={getFieldError('timezone')}
          helperText="Used for scheduling encounters and notifications"
        />
      </div>

      <FormInput
        label="Preferred D&D Edition"
        placeholder="e.g., 5th Edition, Pathfinder 2e"
        value={formData.dndEdition}
        onChange={(e) => updateField('dndEdition', e.target.value)}
        error={getFieldError('dndEdition')}
        helperText="Helps us customize features for your preferred game system"
      />

      <FormSelect
        label="Experience Level"
        options={EXPERIENCE_LEVEL_OPTIONS}
        value={formData.experienceLevel}
        onValueChange={(value) => updateField('experienceLevel', value)}
        error={getFieldError('experienceLevel')}
        helperText="Helps us provide appropriate content and tips"
      />

      <FormSelect
        label="Primary Role"
        options={PRIMARY_ROLE_OPTIONS}
        value={formData.primaryRole}
        onValueChange={(value) => updateField('primaryRole', value)}
        error={getFieldError('primaryRole')}
        helperText="How do you primarily engage with D&D?"
      />
    </>
  );
}

function ProfileFormActions({ handleSkip, isSubmitting }: {
  handleSkip: () => void;
  isSubmitting: boolean;
}) {
  return (
    <>
      <div className="flex gap-3 pt-4">
        <FormSubmitButton
          loadingText="Setting up profile..."
          className="flex-1"
        >
          Complete Setup
        </FormSubmitButton>

        <Button
          type="button"
          variant="outline"
          onClick={handleSkip}
          disabled={isSubmitting}
        >
          Skip for Now
        </Button>
      </div>

      <div className="text-center text-sm text-slate-500 dark:text-slate-400">
        You can update these preferences anytime in your account settings.
      </div>
    </>
  );
}

export function ProfileForm({
  formData,
  updateField,
  handleSubmit,
  handleSkip,
  getFieldError,
  isSubmitting,
  errors,
}: ProfileFormProps) {
  // Find general errors (not tied to specific fields)
  const generalError = errors.find(err => !err.field)?.message;

  return (
    <div className="space-y-6">
      <ProfileFormHeader />

      {generalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}

      <FormWrapper
        onSubmit={handleSubmit}
        errors={errors}
        isSubmitting={isSubmitting}
      >
        <ProfileFormFields
          formData={formData}
          updateField={updateField}
          getFieldError={getFieldError}
        />
        <ProfileFormActions
          handleSkip={handleSkip}
          isSubmitting={isSubmitting}
        />
      </FormWrapper>
    </div>
  );
}