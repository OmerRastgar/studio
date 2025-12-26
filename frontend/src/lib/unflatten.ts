export function unflatten(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const i in data) {
        const keys = i.split('.');
        keys.reduce((acc, part, idx) => {
            if (idx === keys.length - 1) {
                acc[part] = data[i];
            } else {
                acc[part] = acc[part] || {};
            }
            return acc[part];
        }, result);
    }
    return result;
}
