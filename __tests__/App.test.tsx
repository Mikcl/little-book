/**
 * @format
 */

import 'react-native';
import React from 'react';
import App, { unsqueeze } from '../App';

// Note: import explicitly to use the types shipped with jest.
import { describe, expect, it} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

it('renders correctly', async () => {
  let tree;
  await renderer.act(async () => {
      tree = renderer.create(<App />);
  });
  expect(tree).toBeTruthy();
});

describe('unsqueeze', () => {
    it('should group entries by weeks correctly', () => {
        const entries = [
            { date: '20240101', isSuccess: true }, // Monday
            { date: '20240102', isSuccess: false }, // Tuesday
            { date: '20240108', isSuccess: true }, // Next Monday
        ];
        const result = unsqueeze(entries);

        expect(result).toEqual([
            [
                { date: '20240101', isSuccess: true },
                { date: '20240102', isSuccess: false },
            ],
            [
                { date: '20240108', isSuccess: true },
            ],
        ]);
    });

    it('should group entries by weeks correctly, with negative overlap', () => {
        const entries = [
            { date: '20240102', isSuccess: false }, // Tuesday
            { date: '20240108', isSuccess: true }, // Next Monday
        ];
        const result = unsqueeze(entries);

        expect(result).toEqual([
            [
                { date: '20240102', isSuccess: false },
            ],
            [
                { date: '20240108', isSuccess: true },
            ],
        ]);
    });

    it('should group entries by weeks correctly, with positive overlap', () => {
        const entries = [
            { date: '20240102', isSuccess: false }, // Tuesday
            { date: '20240109', isSuccess: true }, // Next Tuesday
        ];
        const result = unsqueeze(entries);

        expect(result).toEqual([
            [
                { date: '20240102', isSuccess: false },
            ],
            [
                { date: '20240109', isSuccess: true },
            ],
        ]);
    });

    it('should create empty weeks if there are gaps between entries', () => {
        const entries = [
            { date: '20240101', isSuccess: true }, // Monday
            { date: '20240115', isSuccess: true }, // Two weeks later (Monday)
        ];
        const result = unsqueeze(entries);

        expect(result).toEqual([
            [
                { date: '20240101', isSuccess: true },
            ],
            [],
            [
                { date: '20240115', isSuccess: true },
            ],
        ]);
    });

    it('should handle a single entry', () => {
        const entries = [{ date: '20240101', isSuccess: true }];
        const result = unsqueeze(entries);

        expect(result).toEqual([
            [
                { date: '20240101', isSuccess: true },
            ],
        ]);
    });

    it('should handle entries spanning across years', () => {
        const entries = [
            { date: '20231231', isSuccess: true }, // Sunday
            { date: '20240101', isSuccess: false }, // Monday
        ];
        const result = unsqueeze(entries);

        expect(result).toEqual([
            [
                { date: '20231231', isSuccess: true },
            ],
            [
                { date: '20240101', isSuccess: false },
            ],
        ]);
    });
});
