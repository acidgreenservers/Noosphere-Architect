import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fallbackCopyTextToClipboard } from '../../../src/utils/clipboard';

describe('clipboard utils', () => {
    let originalClipboard: any;
    let originalExecCommand: any;

    beforeEach(() => {
        // Save original implementations
        originalClipboard = navigator.clipboard;
        originalExecCommand = document.execCommand;

        // Reset mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Restore original implementations
        Object.defineProperty(navigator, 'clipboard', {
            value: originalClipboard,
            configurable: true,
        });
        document.execCommand = originalExecCommand;
    });

    it('should use navigator.clipboard.writeText if available and successful', async () => {
        const mockWriteText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: mockWriteText },
            configurable: true,
        });

        const result = await fallbackCopyTextToClipboard('test text');

        expect(mockWriteText).toHaveBeenCalledWith('test text');
        expect(result).toBe(true);
    });

    it('should fallback to document.execCommand if navigator.clipboard.writeText fails', async () => {
        const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard blocked'));
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: mockWriteText },
            configurable: true,
        });

        document.execCommand = vi.fn().mockReturnValue(true);
        const appendChildSpy = vi.spyOn(document.body, 'appendChild');
        const removeChildSpy = vi.spyOn(document.body, 'removeChild');

        const result = await fallbackCopyTextToClipboard('test text');

        expect(mockWriteText).toHaveBeenCalledWith('test text');
        expect(document.execCommand).toHaveBeenCalledWith('copy');
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        expect(result).toBe(true);
    });

    it('should fallback to document.execCommand if navigator.clipboard is undefined', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            configurable: true,
        });

        document.execCommand = vi.fn().mockReturnValue(true);

        const result = await fallbackCopyTextToClipboard('test text');

        expect(document.execCommand).toHaveBeenCalledWith('copy');
        expect(result).toBe(true);
    });

    it('should return false if both methods fail', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            configurable: true,
        });

        document.execCommand = vi.fn().mockReturnValue(false);

        const result = await fallbackCopyTextToClipboard('test text');

        expect(document.execCommand).toHaveBeenCalledWith('copy');
        expect(result).toBe(false);
    });
});
