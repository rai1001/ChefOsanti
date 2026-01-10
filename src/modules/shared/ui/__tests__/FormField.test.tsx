import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormField } from '../FormField';

describe('FormField', () => {
    it('renders label and input associated correctly', () => {
        render(<FormField id="email" label="Email Address" />);

        // getByLabelText finds the input by its label content, verifying accessibility
        const input = screen.getByLabelText('Email Address');
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('id', 'email');
    });

    it('displays error message and sets aria-invalid', () => {
        const error = { type: 'required', message: 'Email is required' };
        render(
            <FormField
                id="email"
                label="Email"
                error={error}
            />
        );

        expect(screen.getByText('Email is required')).toBeInTheDocument();

        const input = screen.getByLabelText('Email');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAttribute('aria-describedby', 'email-error');
    });

    it('does not have aria-invalid when no error', () => {
        render(<FormField id="email" label="Email" />);
        const input = screen.getByLabelText('Email');
        expect(input).toHaveAttribute('aria-invalid', 'false');
    });
});
