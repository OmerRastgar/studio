"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cloud, Server, Shield } from "lucide-react";

interface AddIntegrationDialogProps {
    onAdd: (integration: any) => void;
}

export function AddIntegrationDialog({ onAdd }: AddIntegrationDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [vendor, setVendor] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [endpoint, setEndpoint] = useState("");
    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");

    const handleSubmit = async (type: string, authType: string) => {
        setLoading(true);

        const integration = {
            name,
            type,
            vendor,
            authType,
            config: {
                ...(apiKey && { apiKey }),
                ...(endpoint && { endpoint }),
                ...(clientId && { clientId }),
                ...(clientSecret && { clientSecret })
            }
        };

        await onAdd(integration);

        // Reset form
        setName("");
        setVendor("");
        setApiKey("");
        setEndpoint("");
        setClientId("");
        setClientSecret("");
        setLoading(false);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Shield className="w-4 h-4 mr-2" />
                    Add Integration
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add CASB Integration</DialogTitle>
                    <DialogDescription>
                        Connect to SaaS applications, on-premises systems, or existing CASB vendors
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="saas" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="saas">
                            <Cloud className="w-4 h-4 mr-2" />
                            SaaS Apps
                        </TabsTrigger>
                        <TabsTrigger value="onprem">
                            <Server className="w-4 h-4 mr-2" />
                            On-Premises
                        </TabsTrigger>
                        <TabsTrigger value="casb">
                            <Shield className="w-4 h-4 mr-2" />
                            CASB Vendors
                        </TabsTrigger>
                    </TabsList>

                    {/* SaaS Applications */}
                    <TabsContent value="saas" className="space-y-4 mt-4">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="saas-type">Application Type</Label>
                                <Select value={vendor} onValueChange={setVendor}>
                                    <SelectTrigger id="saas-type">
                                        <SelectValue placeholder="Select SaaS application" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Microsoft 365">Microsoft 365</SelectItem>
                                        <SelectItem value="Google Workspace">Google Workspace</SelectItem>
                                        <SelectItem value="Salesforce">Salesforce</SelectItem>
                                        <SelectItem value="Slack">Slack</SelectItem>
                                        <SelectItem value="GitHub">GitHub</SelectItem>
                                        <SelectItem value="AWS">AWS</SelectItem>
                                        <SelectItem value="Azure">Azure</SelectItem>
                                        <SelectItem value="GCP">Google Cloud Platform</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="saas-name">Integration Name</Label>
                                <Input
                                    id="saas-name"
                                    placeholder="e.g., Company Microsoft 365"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="saas-clientId">Client ID</Label>
                                <Input
                                    id="saas-clientId"
                                    placeholder="OAuth Client ID"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="saas-clientSecret">Client Secret</Label>
                                <Input
                                    id="saas-clientSecret"
                                    type="password"
                                    placeholder="OAuth Client Secret"
                                    value={clientSecret}
                                    onChange={(e) => setClientSecret(e.target.value)}
                                />
                            </div>

                            <Button
                                onClick={() => handleSubmit("saas_" + vendor.toLowerCase().replace(/\s/g, "_"), "oauth2")}
                                disabled={!name || !vendor || !clientId || !clientSecret || loading}
                                className="w-full"
                            >
                                {loading ? "Connecting..." : "Connect SaaS Application"}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* On-Premises Systems */}
                    <TabsContent value="onprem" className="space-y-4 mt-4">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="onprem-type">System Type</Label>
                                <Select value={vendor} onValueChange={setVendor}>
                                    <SelectTrigger id="onprem-type">
                                        <SelectValue placeholder="Select on-prem system" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Exchange Server">Exchange Server</SelectItem>
                                        <SelectItem value="SharePoint">SharePoint</SelectItem>
                                        <SelectItem value="Active Directory">Active Directory</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="onprem-name">Integration Name</Label>
                                <Input
                                    id="onprem-name"
                                    placeholder="e.g., Corporate Exchange"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="onprem-endpoint">Server Endpoint</Label>
                                <Input
                                    id="onprem-endpoint"
                                    placeholder="https://exchange.company.com"
                                    value={endpoint}
                                    onChange={(e) => setEndpoint(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="onprem-apikey">API Key / Access Token</Label>
                                <Input
                                    id="onprem-apikey"
                                    type="password"
                                    placeholder="API Key or Access Token"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                            </div>

                            <Button
                                onClick={() => handleSubmit("onprem_" + vendor.toLowerCase().replace(/\s/g, "_"), "api_key")}
                                disabled={!name || !vendor || !endpoint || !apiKey || loading}
                                className="w-full"
                            >
                                {loading ? "Connecting..." : "Connect On-Prem System"}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* CASB Vendors */}
                    <TabsContent value="casb" className="space-y-4 mt-4">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="casb-vendor">CASB Vendor</Label>
                                <Select value={vendor} onValueChange={setVendor}>
                                    <SelectTrigger id="casb-vendor">
                                        <SelectValue placeholder="Select CASB vendor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Netskope">Netskope</SelectItem>
                                        <SelectItem value="McAfee MVISION">McAfee MVISION</SelectItem>
                                        <SelectItem value="Zscaler">Zscaler</SelectItem>
                                        <SelectItem value="Cisco Cloudlock">Cisco Cloudlock</SelectItem>
                                        <SelectItem value="Cloudflare">Cloudflare</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="casb-name">Integration Name</Label>
                                <Input
                                    id="casb-name"
                                    placeholder="e.g., Company Netskope"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="casb-endpoint">API Endpoint</Label>
                                <Input
                                    id="casb-endpoint"
                                    placeholder="https://api.netskope.com"
                                    value={endpoint}
                                    onChange={(e) => setEndpoint(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="casb-apikey">API Key</Label>
                                <Input
                                    id="casb-apikey"
                                    type="password"
                                    placeholder="CASB API Key"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                            </div>

                            <Button
                                onClick={() => handleSubmit("casb_" + vendor.toLowerCase().replace(/\s/g, "_"), "api_key")}
                                disabled={!name || !vendor || !endpoint || !apiKey || loading}
                                className="w-full"
                            >
                                {loading ? "Connecting..." : "Connect CASB Vendor"}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
