import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Terms & Conditions</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: {new Date().getFullYear()}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-6">
            <section className="space-y-2">
              <h2 className="text-base font-semibold">1) Acceptance of Terms</h2>
              <p>
                By accessing or using this application, you agree to follow these Terms & Conditions. If you do not agree,
                please do not use the app.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">2) Account & Access</h2>
              <p>
                You are responsible for maintaining the confidentiality of your login credentials and for all activity that
                occurs under your account.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">3) User Responsibilities</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Provide accurate information when requested.</li>
                <li>Do not misuse the app, attempt unauthorized access, or disrupt services.</li>
                <li>Comply with applicable laws and regulations.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">4) Content & Services</h2>
              <p>
                The app and its content are provided on an “as-is” basis. We may update, modify, or discontinue features at
                any time.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">5) Payments / Transactions (If Applicable)</h2>
              <p>
                Any payments, deposits, withdrawals, or investment-related actions must be performed as per the app’s
                workflow and applicable rules. You are responsible for verifying details before confirming any action.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">6) Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential
                damages arising from your use of the app.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">7) Termination</h2>
              <p>
                We may suspend or terminate access to the app if we believe there is misuse, security risk, or violation of
                these terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">8) Contact</h2>
              <p>
                If you have questions about these Terms & Conditions, you can contact us at:
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
