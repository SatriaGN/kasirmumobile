import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

/** Valid Ionicons glyph name (e.g. "cart-outline"). */
export type IconName = ComponentProps<typeof Ionicons>['name'];
