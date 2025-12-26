import { UiNode, UiNodeInputAttributes, UiNodeScriptAttributes } from "@ory/client";
import { FormEvent, useState } from "react";
import { NodeInput } from "./NodeInput";
import { NodeScript } from "./NodeScript";
import { NodeButton } from "./NodeButton";

interface FlowNodesProps {
    nodes: UiNode[];
    isLoading: boolean;
    onSubmit: (e: FormEvent) => void;
    onResend?: () => void;
    onMethodClick?: (value: string) => void;
    botProof?: boolean;
}

export const FlowNodes = ({ nodes, isLoading, onSubmit, onResend, onMethodClick }: FlowNodesProps) => {
    // Initialize state with default values from nodes
    const [values, setValues] = useState<Record<string, any>>(() => {
        const initialValues: Record<string, any> = {};
        nodes.forEach(node => {
            const attributes = node.attributes as UiNodeInputAttributes;
            if (attributes.node_type === "input") {
                initialValues[attributes.name] = attributes.value;
            }
        });
        return initialValues;
    });

    // Handle input change
    const handleChange = (name: string, value: any) => {
        setValues(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {/* Loop through all nodes and render based on attribute type */}
            {nodes.map((node, k) => {
                const attributes = node.attributes;

                // Handle Scripts
                if (attributes.node_type === "script") {
                    return <NodeScript key={k} node={node} attributes={attributes as UiNodeScriptAttributes} />;
                }

                // Handle Images (QR Codes for TOTP)
                if (attributes.node_type === "img") {
                    const imgAttrs = attributes as any;
                    return (
                        <div key={k} className="flex justify-center my-4">
                            <img
                                src={imgAttrs.src}
                                alt={node.meta.label?.text || "QR Code"}
                                width={imgAttrs.width}
                                height={imgAttrs.height}
                                className="border rounded-lg p-2 bg-white"
                            />
                        </div>
                    );
                }

                // Handle Text (TOTP Secret Key / Backup Codes)
                if (attributes.node_type === "text") {
                    const textAttrs = attributes as any;
                    return (
                        <div key={k} className="my-4 space-y-2">
                            {node.meta.label?.text && <p className="text-sm font-medium">{node.meta.label.text}</p>}
                            <div className="p-3 bg-muted rounded-md font-mono text-sm break-all border">
                                {textAttrs.text.text}
                            </div>
                        </div>
                    );
                }

                // Handle Inputs
                if (attributes.node_type === "input") {
                    const inputAttrs = attributes as UiNodeInputAttributes;
                    if (inputAttrs.type === "submit") return null; // Submit buttons rendered separately at bottom

                    return (
                        <NodeInput
                            key={k}
                            node={node}
                            value={values[inputAttrs.name] ?? ""} // Use local state
                            setValue={(val) => handleChange(inputAttrs.name, val)}
                            disabled={isLoading}
                            dispatchSubmit={onSubmit}
                        />
                    );
                }

                return null;
            })}

            {/* Render Submit Buttons */}
            <div className="flex flex-col gap-2 mt-4">
                {nodes
                    .filter((node) => node.attributes.node_type === "input" && (node.attributes as UiNodeInputAttributes).type === "submit")
                    .map((node, k) => (
                        <NodeButton
                            key={k}
                            node={node}
                            attributes={node.attributes as UiNodeInputAttributes}
                            isLoading={isLoading}
                            onResend={onResend}
                            onMethodClick={onMethodClick}
                        />
                    ))
                }
            </div>
        </form>
    );
};
