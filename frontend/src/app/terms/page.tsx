import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TermsPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
            <Card className="w-full max-w-4xl shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl">Terms of Service</CardTitle>
                        <Link href="/login">
                            <Button variant="ghost">Back to Login</Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <h3>1. Agreement to Terms</h3>
                    <p>
                        These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Cybergaar ("we," "us" or "our"), concerning your access to and use of the Audit Platform website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site").
                    </p>

                    <h3>2. Intellectual Property Rights</h3>
                    <p>
                        Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights.
                    </p>

                    <h3>3. User Representations</h3>
                    <p>
                        By using the Site, you represent and warrant that:
                        <ul>
                            <li>All registration information you submit will be true, accurate, current, and complete.</li>
                            <li>You will maintain the accuracy of such information and promptly update such registration information as necessary.</li>
                            <li>You have the legal capacity and you agree to comply with these Terms of Service.</li>
                            <li>You are not a minor in the jurisdiction in which you reside.</li>
                        </ul>
                    </p>

                    <h3>4. Prohibited Activities</h3>
                    <p>
                        You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
                    </p>

                    <h3>5. Governed Law</h3>
                    <p>
                        These conditions are governed by and interpreted following the laws of appropriate jurisdiction, and the use of the United Nations Convention of Contracts for the International Sale of Goods is expressly excluded.
                    </p>

                    <h3>6. Contact Us</h3>
                    <p>
                        In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at support@cybergaar.com.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
