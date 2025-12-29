import { UiNode, UiNodeInputAttributes } from "@ory/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface NodeInputProps {
    node: UiNode;
    value: any;
    setValue: (value: any) => void;
    disabled: boolean;
    dispatchSubmit: (e: React.FormEvent) => void;
}

export const NodeInput = ({ node, value, setValue, disabled, dispatchSubmit }: NodeInputProps) => {
    const attributes = node.attributes as UiNodeInputAttributes;
    const type = attributes.type;

    // Render Hidden Fields
    if (type === "hidden") {
        return <input type={type} name={attributes.name} value={attributes.value || "true"} />;
    }

    // Render Checkbox (e.g. Terms of Service, Remember Me)
    if (type === "checkbox") {
        return (
            <div className="flex items-center space-x-2 my-2">
                <Checkbox
                    id={attributes.name}
                    name={attributes.name}
                    checked={value}
                    onCheckedChange={(checked) => setValue(checked)}
                    disabled={disabled}
                />
                <Label htmlFor={attributes.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {node.meta.label?.text}
                </Label>
                {node.messages.map((msg) => (
                    <p key={msg.id} className="text-[0.8rem] font-medium text-destructive mt-1">
                        {msg.text}
                    </p>
                ))}
            </div>
        );
    }

    // Render Submit Button (Handled separately in FlowNodes typically, but checking here just in case)
    if (type === "submit") {
        return null; // We usually render submit buttons manually at the bottom of the form
    }

    // Render Standard Inputs (Email, Password, Text)
    return (
        <div className="grid w-full items-center gap-1.5 my-2">
            <Label htmlFor={attributes.name}>{node.meta.label?.text}</Label>
            <Input
                id={attributes.name}
                name={attributes.name}
                type={type}
                placeholder={node.meta.label?.text}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={disabled}
                className={node.messages?.some(m => m.type === 'error') ? "border-destructive" : ""}
            />
            {node.messages?.map((msg) => (
                <p key={msg.id} className="text-[0.8rem] font-medium text-destructive mt-1">
                    {msg.text}
                </p>
            ))}
        </div>
    );
};
