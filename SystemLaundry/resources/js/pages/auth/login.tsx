import { Form, Head, usePage } from '@inertiajs/react';
import { PackageSearch } from 'lucide-react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { login, register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { track } from '@/routes/public';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

/**
 * login-03 block (card shell comes from AuthLayout). Staff and customers share one secure
 * login; the account's role decides where they land. The footer's "Staff login" link adds
 * ?staff=1, which only changes the heading (docs/public-site/04 §11).
 */
export default function Login({ status, canResetPassword }: Props) {
    const { url, props } = usePage();
    const staff =
        new URLSearchParams(url.split('?')[1] ?? '').get('staff') === '1';
    const shopName = props.site?.name ?? props.shop?.name ?? props.name;

    return (
        <>
            <Head title={staff ? 'Staff login' : 'Log in'} />

            <div className="mb-6 grid gap-1.5 text-center">
                <h1 className="text-xl leading-none font-semibold">
                    {staff ? 'Staff login' : 'Welcome back'}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {staff ? (
                        <>
                            For {shopName} staff only. Customers, please use the{' '}
                            <TextLink href={login()}>customer login</TextLink>.
                        </>
                    ) : (
                        'Log in to see your orders and book pickups faster.'
                    )}
                </p>
            </div>

            {status && (
                <Alert className="mb-6 border-success/30 bg-success/10 text-success">
                    <AlertDescription className="text-success">
                        {status}
                    </AlertDescription>
                </Alert>
            )}

            <PasskeyVerify />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        {/* A deactivated account comes back as an email error; show it prominently. */}
                        {errors.email?.includes('deactivated') && (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    {errors.email}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                />
                                {!errors.email?.includes('deactivated') && (
                                    <InputError message={errors.email} />
                                )}
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm"
                                            tabIndex={5}
                                        >
                                            Forgot your password?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember">Remember me</Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Log in
                            </Button>
                        </div>

                        {!staff && (
                            <p className="text-center text-sm text-muted-foreground">
                                New here?{' '}
                                <TextLink
                                    href={register()}
                                    data-test="register-link"
                                    tabIndex={5}
                                >
                                    Create an account
                                </TextLink>
                            </p>
                        )}
                    </>
                )}
            </Form>

            {!staff && (
                <>
                    <Separator className="my-6" />

                    <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                        <PackageSearch className="size-4" aria-hidden />
                        <span>
                            Just checking an order?{' '}
                            <TextLink href={track()}>
                                Track it without logging in
                            </TextLink>
                        </span>
                    </p>
                </>
            )}
        </>
    );
}
