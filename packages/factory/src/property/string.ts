import { hasTemplateTokens, renderTemplate } from '../utils/template';
import type { GenerationContext, PropertyConfig } from '../types';
import { Property } from './base';

export type StringConfig = PropertyConfig & {
  /**
   * When `spec` is a string[], never reuse a value within one generation context
   * (`generateList` / shared `ctx`). Throws if the distinct pool is exhausted.
   */
  unique?: boolean;
};

export class StringProperty extends Property<string> {
  constructor(
    private readonly spec: string | string[] | null,
    config: StringConfig = {},
  ) {
    super(config);
  }

  withConfig(config: PropertyConfig): this {
    return new StringProperty(this.spec, { ...this.config, ...config }) as this;
  }

  generateValue(ctx: GenerationContext): string {
    const template = this.config.template;
    if (template) {
      return renderTemplate(template, ctx, {
        case: this.config.case,
        date: this.resolveAnchorDate(ctx),
      });
    }

    if (Array.isArray(this.spec)) {
      if (this.spec.length === 0) return '';
      if ((this.config as StringConfig).unique) {
        return ctx.pickUnique(this, this.spec);
      }
      const i = Math.floor(ctx.random() * this.spec.length);
      return this.spec[i]!;
    }

    if (typeof this.spec === 'string') {
      if ((this.config as StringConfig).unique) {
        throw new Error('property.string({ unique: true }) requires a string[] pool');
      }
      if (hasTemplateTokens(this.spec)) {
        return renderTemplate(this.spec, ctx, {
          case: this.config.case,
          date: this.resolveAnchorDate(ctx),
        });
      }
      return this.spec;
    }

    return '';
  }
}

export function string(value?: string | string[], config?: StringConfig): StringProperty {
  return new StringProperty(value ?? '', config);
}

export function template(pattern: string, config?: StringConfig): StringProperty {
  return new StringProperty(pattern, { ...config, template: pattern });
}
