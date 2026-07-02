export type LoginFieldErrors = Partial<Record<"email" | "password", string>>;
export type SignupFieldErrors = Partial<Record<"name" | "email" | "password", string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string) {
  const normalized = email.trim();

  if (!normalized) return "Email wajib diisi";
  if (!EMAIL_PATTERN.test(normalized)) return "Masukkan email yang valid";

  return "";
}

export function validateLoginForm(values: { email: string; password: string }): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const emailError = validateEmail(values.email);

  if (emailError) errors.email = emailError;
  if (!values.password) errors.password = "Kata sandi wajib diisi";

  return errors;
}

export function validateSignupForm(values: { name: string; email: string; password: string }): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  const emailError = validateEmail(values.email);

  if (!values.name.trim()) {
    errors.name = "Nama lengkap wajib diisi";
  } else if (values.name.trim().length < 2) {
    errors.name = "Nama terlalu pendek";
  }

  if (emailError) errors.email = emailError;

  if (!values.password) {
    errors.password = "Kata sandi wajib diisi";
  } else if (values.password.length < 8) {
    errors.password = "Kata sandi minimal 8 karakter";
  }

  return errors;
}

export function hasFieldErrors(errors: Record<string, string | undefined>) {
  return Object.values(errors).some(Boolean);
}
