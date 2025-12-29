import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-muted/40 py-8 px-4 flex justify-center">
            <Card className="w-full max-w-5xl shadow-sm border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <CardHeader className="border-b bg-muted/20 pb-8">
                    <div className="flex items-center justify-between mb-6">
                        <Link href="/login">
                            <Button variant="ghost" size="sm" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Button>
                        </Link>
                        <div className="text-sm text-muted-foreground">
                            Last updated December 29, 2025
                        </div>
                    </div>
                    <CardTitle className="text-4xl font-bold tracking-tight text-center">Privacy Policy</CardTitle>
                </CardHeader>
                <CardContent className="p-8 prose prose-slate dark:prose-invert max-w-none">
                    <div className="space-y-6">
                        <p>
                            This Privacy Notice for <strong>CyberGaar</strong> ('we', 'us', or 'our'), describes how and why we might access, collect, store, use, and/or share ('process') your personal information when you use our services ('Services'), including when you:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Visit our website at <a href="http://www.cybergaar.com" className="text-primary hover:underline">http://www.cybergaar.com</a> or any website of ours that links to this Privacy Notice</li>
                            <li>Download and use our mobile application (Audit Plateform), or any other application of ours that links to this Privacy Notice</li>
                            <li>Engage with us in other related ways, including any marketing or events</li>
                        </ul>
                        <p>
                            <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at <a href="mailto:privacy@cybergaar.com" className="text-primary hover:underline">privacy@cybergaar.com</a>.
                        </p>

                        <div className="bg-muted/50 p-6 rounded-lg border my-8">
                            <h2 className="text-xl font-semibold mb-4 mt-0">Summary of Key Points</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents below to find the section you are looking for.
                            </p>
                            <ul className="space-y-3 text-sm">
                                <li><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use. <a href="#info-collect" className="text-primary hover:underline">Learn more about personal information you disclose to us.</a></li>
                                <li><strong>Do we process any sensitive personal information?</strong> Some of the information may be considered 'special' or 'sensitive' in certain jurisdictions. We do not process sensitive personal information.</li>
                                <li><strong>Do we collect any information from third parties?</strong> We do not collect any information from third parties.</li>
                                <li><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. <a href="#info-process" className="text-primary hover:underline">Learn more about how we process your information.</a></li>
                                <li><strong>In what situations and with which parties do we share personal information?</strong> We may share information in specific situations and with specific third parties. <a href="#info-share" className="text-primary hover:underline">Learn more about when and with whom we share your personal information.</a></li>
                                <li><strong>How do we keep your information safe?</strong> We have adequate organisational and technical processes and procedures in place to protect your personal information. <a href="#info-safe" className="text-primary hover:underline">Learn more about how we keep your information safe.</a></li>
                                <li><strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information. <a href="#privacy-rights" className="text-primary hover:underline">Learn more about your privacy rights.</a></li>
                                <li><strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by submitting a data subject access request, or by contacting us.</li>
                            </ul>
                        </div>

                        <h2 className="text-2xl font-bold mt-12 mb-6 border-b pb-2">Table of Contents</h2>
                        <ol className="list-decimal pl-6 space-y-1 text-primary">
                            <li><a href="#info-collect" className="hover:underline">WHAT INFORMATION DO WE COLLECT?</a></li>
                            <li><a href="#info-process" className="hover:underline">HOW DO WE PROCESS YOUR INFORMATION?</a></li>
                            <li><a href="#legal-bases" className="hover:underline">WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?</a></li>
                            <li><a href="#info-share" className="hover:underline">WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</a></li>
                            <li><a href="#cookies" className="hover:underline">DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</a></li>
                            <li><a href="#ai-products" className="hover:underline">DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?</a></li>
                            <li><a href="#social-logins" className="hover:underline">HOW DO WE HANDLE YOUR SOCIAL LOGINS?</a></li>
                            <li><a href="#intl-transfers" className="hover:underline">IS YOUR INFORMATION TRANSFERRED INTERNATIONALLY?</a></li>
                            <li><a href="#retention" className="hover:underline">HOW LONG DO WE KEEP YOUR INFORMATION?</a></li>
                            <li><a href="#info-safe" className="hover:underline">HOW DO WE KEEP YOUR INFORMATION SAFE?</a></li>
                            <li><a href="#minors" className="hover:underline">DO WE COLLECT INFORMATION FROM MINORS?</a></li>
                            <li><a href="#privacy-rights" className="hover:underline">WHAT ARE YOUR PRIVACY RIGHTS?</a></li>
                            <li><a href="#dnt" className="hover:underline">CONTROLS FOR DO-NOT-TRACK FEATURES</a></li>
                            <li><a href="#us-rights" className="hover:underline">DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</a></li>
                            <li><a href="#updates" className="hover:underline">DO WE MAKE UPDATES TO THIS NOTICE?</a></li>
                            <li><a href="#contact" className="hover:underline">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a></li>
                            <li><a href="#review-data" className="hover:underline">HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</a></li>
                        </ol>

                        <div className="mt-12 space-y-12">
                            <section id="info-collect" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">1. WHAT INFORMATION DO WE COLLECT?</h3>
                                <h4 className="font-semibold mb-2">Personal information you disclose to us</h4>
                                <p className="text-muted-foreground italic mb-4">In Short: We collect personal information that you provide to us.</p>
                                <p>We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.</p>
                                <p className="mt-4"><strong>Personal Information Provided by You.</strong> The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:</p>
                                <ul className="list-disc pl-6 mt-2 grid grid-cols-2 gap-2">
                                    <li>names</li>
                                    <li>phone numbers</li>
                                    <li>email addresses</li>
                                    <li>job titles</li>
                                    <li>usernames</li>
                                    <li>passwords</li>
                                </ul>
                                <p className="mt-4"><strong>Sensitive Information.</strong> We do not process sensitive information.</p>
                                <p className="mt-4"><strong>Social Media Login Data.</strong> We may provide you with the option to register with us using your existing social media account details, like your Facebook, X, or other social media account. If you choose to register in this way, we will collect certain profile information about you from the social media provider, as described in the section called <a href="#social-logins" className="text-primary hover:underline">'HOW DO WE HANDLE YOUR SOCIAL LOGINS?'</a> below.</p>
                                <p className="mt-4"><strong>Application Data.</strong> If you use our application(s), we also may collect the following information if you choose to provide us with access or permission:</p>
                                <ul className="list-disc pl-6 mt-2">
                                    <li><strong>Push Notifications.</strong> We may request to send you push notifications regarding your account or certain features of the application(s). If you wish to opt out from receiving these types of communications, you may turn them off in your device's settings.</li>
                                </ul>
                                <p className="mt-4">This information is primarily needed to maintain the security and operation of our application(s), for troubleshooting, and for our internal analytics and reporting purposes.</p>
                                <p>All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.</p>
                                <h4 className="font-semibold mt-6 mb-2">Google API</h4>
                                <p>Our use of information received from Google APIs will adhere to Google API Services User Data Policy, including the Limited Use requirements.</p>
                            </section>

                            <section id="info-process" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">2. HOW DO WE PROCESS YOUR INFORMATION?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We process the personal information for the following purposes listed below. We may also process your information for other purposes only with your prior explicit consent.</p>
                                <p>We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</p>
                                <ul className="list-disc pl-6 mt-2 space-y-2">
                                    <li><strong>To facilitate account creation and authentication and otherwise manage user accounts.</strong> We may process your information so you can create and log in to your account, as well as keep your account in working order.</li>
                                    <li><strong>To deliver and facilitate delivery of services to the user.</strong> We may process your information to provide you with the requested service.</li>
                                    <li><strong>To send administrative information to you.</strong> We may process your information to send you details about our products and services, changes to our terms and policies, and other similar information.</li>
                                    <li><strong>To save or protect an individual's vital interest.</strong> We may process your information when necessary to save or protect an individual’s vital interest, such as to prevent harm.</li>
                                </ul>
                            </section>

                            <section id="legal-bases" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: We only process your personal information when we believe it is necessary and we have a valid legal reason (i.e. legal basis) to do so under applicable law, like with your consent, to comply with laws, to provide you with services to enter into or fulfil our contractual obligations, to protect your rights, or to fulfil our legitimate business interests.</p>

                                <h4 className="font-semibold mt-4 mb-2">If you are located in the EU or UK, this section applies to you.</h4>
                                <p>The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases we rely on in order to process your personal information. As such, we may rely on the following legal bases to process your personal information:</p>
                                <ul className="list-disc pl-6 mt-2 space-y-2">
                                    <li><strong>Consent.</strong> We may process your information if you have given us permission (i.e. consent) to use your personal information for a specific purpose. You can withdraw your consent at any time.</li>
                                    <li><strong>Performance of a Contract.</strong> We may process your personal information when we believe it is necessary to fulfil our contractual obligations to you, including providing our Services or at your request prior to entering into a contract with you.</li>
                                    <li><strong>Legal Obligations.</strong> We may process your information where we believe it is necessary for compliance with our legal obligations, such as to cooperate with a law enforcement body or regulatory agency, exercise or defend our legal rights, or disclose your information as evidence in litigation in which we are involved.</li>
                                    <li><strong>Vital Interests.</strong> We may process your information where we believe it is necessary to protect your vital interests or the vital interests of a third party, such as situations involving potential threats to the safety of any person.</li>
                                </ul>

                                <h4 className="font-semibold mt-6 mb-2">If you are located in Canada, this section applies to you.</h4>
                                <p>We may process your information if you have given us specific permission (i.e. express consent) to use your personal information for a specific purpose, or in situations where your permission can be inferred (i.e. implied consent). You can withdraw your consent at any time.</p>
                            </section>

                            <section id="info-share" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: We may share information in specific situations described in this section and/or with the following third parties.</p>
                                <p>We may need to share your personal information in the following situations:</p>
                                <ul className="list-disc pl-6 mt-2">
                                    <li><strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
                                </ul>
                            </section>

                            <section id="cookies" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">5. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: We may use cookies and other tracking technologies to collect and store your information.</p>
                                <p>We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information when you interact with our Services. Some online tracking technologies help us maintain the security of our Services and your account, prevent crashes, fix bugs, save your preferences, and assist with basic site functions.</p>
                            </section>

                            <section id="ai-products" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">6. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: We offer products, features, or tools powered by artificial intelligence, machine learning, or similar technologies.</p>
                                <p>As part of our Services, we offer products, features, or tools powered by artificial intelligence, machine learning, or similar technologies (collectively, 'AI Products'). These tools are designed to enhance your experience and provide you with innovative solutions. The terms in this Privacy Notice govern your use of the AI Products within our Services.</p>
                                <p className="mt-4"><strong>Use of AI Technologies.</strong> We provide the AI Products through third-party service providers ('AI Service Providers'), including 01.AI. As outlined in this Privacy Notice, your input, output, and personal information will be shared with and processed by these AI Service Providers.</p>
                            </section>

                            <section id="social-logins" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">7. HOW DO WE HANDLE YOUR SOCIAL LOGINS?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: If you choose to register or log in to our Services using a social media account, we may have access to certain information about you.</p>
                                <p>Our Services offer you the ability to register and log in using your third-party social media account details (like your Facebook or X logins). Where you choose to do this, we will receive certain profile information about you from your social media provider. The profile information we receive may vary depending on the social media provider concerned, but will often include your name, email address, friends list, and profile picture, as well as other information you choose to make public on such a social media platform.</p>
                            </section>

                            <section id="intl-transfers" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">8. IS YOUR INFORMATION TRANSFERRED INTERNATIONALLY?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: We may transfer, store, and process your information in countries other than your own.</p>
                                <p>Regardless of your location, please be aware that your information may be transferred to, stored by, and processed by us in our facilities and in the facilities of the third parties with whom we may share your personal information.</p>
                            </section>

                            <section id="retention" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">9. HOW LONG DO WE KEEP YOUR INFORMATION?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: We keep your information for as long as necessary to fulfil the purposes outlined in this Privacy Notice unless otherwise required by law.</p>
                                <p>We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us.</p>
                            </section>

                            <section id="info-safe" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">10. HOW DO WE KEEP YOUR INFORMATION SAFE?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: We aim to protect your personal information through a system of organisational and technical security measures.</p>
                                <p>We have implemented appropriate and reasonable technical and organisational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorised third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information.</p>
                            </section>

                            <section id="minors" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">11. DO WE COLLECT INFORMATION FROM MINORS?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: We do not knowingly collect data from or market to children under 18 years of age or the equivalent age as specified by law in your jurisdiction.</p>
                                <p>We do not knowingly collect, solicit data from, or market to children under 18 years of age or the equivalent age as specified by law in your jurisdiction, nor do we knowingly sell such personal information.</p>
                            </section>

                            <section id="privacy-rights" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">12. WHAT ARE YOUR PRIVACY RIGHTS?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: You may review, change, or terminate your account at any time.</p>
                                <p>In some regions (like the EEA, UK, Switzerland, and Canada), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; (iv) if applicable, to data portability; and (v) not to be subject to automated decision-making.</p>
                                <p className="mt-4"><strong>Account Information.</strong> If you would at any time like to review or change the information in your account or terminate your account, you can contact us using the contact information provided.</p>
                            </section>

                            <section id="dnt" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">13. CONTROLS FOR DO-NOT-TRACK FEATURES</h3>
                                <p>Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ('DNT') feature. At this stage, no uniform technology standard for recognising and implementing DNT signals has been finalised. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online.</p>
                            </section>

                            <section id="us-rights" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">14. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee, Texas, Utah, or Virginia, you may have specific rights.</p>
                                <p>These rights include:</p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Right to know whether or not we are processing your personal data</li>
                                    <li>Right to access your personal data</li>
                                    <li>Right to correct inaccuracies in your personal data</li>
                                    <li>Right to request the deletion of your personal data</li>
                                    <li>Right to obtain a copy of the personal data you previously shared with us</li>
                                    <li>Right to non-discrimination for exercising your rights</li>
                                    <li>Right to opt out of the processing of your personal data if it is used for targeted advertising</li>
                                </ul>
                            </section>

                            <section id="updates" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">15. DO WE MAKE UPDATES TO THIS NOTICE?</h3>
                                <p className="text-muted-foreground italic mb-4">In Short: Yes, we will update this notice as necessary to stay compliant with relevant laws.</p>
                                <p>We may update this Privacy Notice from time to time. The updated version will be indicated by an updated 'Revised' date at the top of this Privacy Notice.</p>
                            </section>

                            <section id="contact" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">16. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h3>
                                <p>If you have questions or comments about this notice, you may contact us by post at:</p>
                                <address className="mt-4 not-italic">
                                    <strong>CyberGaar</strong>
                                </address>
                                <p className="mt-2">Or email us at <a href="mailto:privacy@cybergaar.com" className="text-primary hover:underline">privacy@cybergaar.com</a></p>
                            </section>

                            <section id="review-data" className="scroll-mt-20">
                                <h3 className="text-xl font-bold mb-4">17. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</h3>
                                <p>Based on the applicable laws of your country or state of residence in the US, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information.</p>
                            </section>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
