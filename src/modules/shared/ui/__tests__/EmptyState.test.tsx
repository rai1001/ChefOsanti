import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from '../EmptyState';
import { Mail } from 'lucide-react';

describe('EmptyState', () => {
    it('renders title and description', () => {
        render(
            <EmptyState
                title="No items found"
                description="Try adjusting your search filters."
            />
        );

        expect(screen.getByText('No items found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search filters.')).toBeInTheDocument();
    });

    it('renders with an icon', () => {
        const { container } = render(
            <EmptyState
                icon={Mail}
                title="Inbox empty"
            />
        );
        // Lucide icons render as SVGs. We can check if an SVG is present.
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders primary action and handles click', () => {
        const handleClick = vi.fn();
        render(
            <EmptyState
                title="Empty"
                action={<button onClick={handleClick}>Create New</button>}
            />
        );

        const button = screen.getByText('Create New');
        expect(button).toBeInTheDocument();
        fireEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });
});
