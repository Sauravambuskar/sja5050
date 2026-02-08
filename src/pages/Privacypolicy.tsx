import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: {new Date().getFullYear()}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-6">
            <section className="space-y-2">
              <h2 className="text-base font-semibold">Overview</h2>
              <p>
                This Privacy Policy explains how we collect, use, and protect information when you use this application.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Information We Collect</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <span className="font-medium">Account information</span> (such as email) used for authentication.
                </li>
                <li>
                  <span className="font-medium">Profile details</span> you provide in the app (for example: name, phone,
                  address, date of birth).
                </li>
                <li>
                  <span className="font-medium">KYC / verification information</span> if you submit it for compliance or
                  account verification.
                </li>
                <li>
                  <span className="font-medium">Usage and activity data</span> necessary for app features (such as requests,
                  transactions, and support tickets).
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">How We Use Information</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>To create and manage your account and provide core app functionality.</li>
                <li>To process requests, payments/transactions (if applicable), and provide support.</li>
                <li>To improve security, prevent fraud, and maintain system integrity.</li>
                <li>To communicate important service and account-related updates.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Sharing of Information</h2>
              <p>
                We do not sell your personal information. We may share information only when required to operate the
                service, comply with law, or protect the rights and safety of users and the platform.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Data Security</h2>
              <p>
                We use reasonable safeguards to protect your information. No method of transmission or storage is 100%
                secure, but we work to protect your data from unauthorized access.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Your Choices</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>You can update certain profile information in the app.</li>
                <li>You can request support for data-related questions using the support section.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Contact</h2>
              <p>
                If you have any questions about this Privacy Policy, contact us at:
                <br />
                <a className="underline" href="mailto:it.sainikjankalyan@gmail.com">
                  it.sainikjankalyan@gmail.com
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}