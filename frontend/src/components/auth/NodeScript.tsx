import { UiNode, UiNodeScriptAttributes } from "@ory/client";
import { useEffect } from "react";

interface NodeScriptProps {
    node: UiNode;
    attributes: UiNodeScriptAttributes;
}

export const NodeScript = ({ node, attributes }: NodeScriptProps) => {
    useEffect(() => {
        const script = document.createElement("script");
        script.src = attributes.src;
        script.async = attributes.async;
        script.type = attributes.type;
        script.referrerPolicy = attributes.referrerpolicy;
        script.crossOrigin = attributes.crossorigin;
        script.integrity = attributes.integrity;

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [attributes]);

    return null;
};
