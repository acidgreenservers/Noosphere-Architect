export const getDeepSearchText = (obj: any, seen = new WeakSet()): string => {
    if (obj === null || obj === undefined) return '';
    
    // Prevent circular references
    if (typeof obj === 'object') {
        if (seen.has(obj)) return '';
        seen.add(obj);
    }

    if (typeof obj === 'string') {
        return obj.toLowerCase();
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
        return String(obj).toLowerCase();
    }

    if (Array.isArray(obj)) {
        return obj.map(item => getDeepSearchText(item, seen)).join(' ');
    }

    if (typeof obj === 'object') {
        return Object.values(obj)
            .map(val => getDeepSearchText(val, seen))
            .join(' ');
    }

    return '';
};
