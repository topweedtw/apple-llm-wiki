# ADR-002: Apple Product Entity Schema

## Status

Proposed

## Date

2026-06-10

## Context

ADR-001 defines the Apple LLM Wiki as a source-grounded knowledge base organized around sources, entities, facts, pages, retrieval, and freshness.

The next decision is how Apple-related concepts should be modeled as entities. This matters because entity IDs will become the stable backbone for facts, citations, pages, comparisons, compatibility rules, and future ingestion jobs.

Apple product knowledge has several modeling challenges:

- A product line can contain many generations, such as iPhone, iPhone 15 series, and iPhone 15 Pro.
- Apple sometimes uses marketing names, technical identifiers, order numbers, model numbers, and regional variants for the same product.
- Some concepts are physical products, while others are chips, operating systems, features, events, accessories, services, or support policies.
- Product names can be reused or ambiguous, such as MacBook, iPad, Apple TV, or HomePod.
- Many useful answers require relationships, such as "uses chip", "runs operating system", "announced at event", "compatible with accessory", or "replaced by product".
- Some entities vary by locale, region, carrier, storage tier, or configuration, while others are global.

The schema must preserve stable identity without forcing every spec, variant, or price into the entity itself. Detailed claims should live in facts, not in entity records.

## Decision

Use a typed, stable, canonical entity schema with explicit relationships and alias metadata.

Entities will represent durable objects or concepts. Facts will represent claims about those entities. Wiki pages will present curated views of entities and facts.

The entity schema will follow these principles:

- Entity IDs are stable and lowercase.
- Entity IDs use a typed namespace prefix.
- Canonical entity names are human-readable but not used as primary keys.
- Aliases, model numbers, and search names are metadata, not identity.
- Regional and configuration-specific differences are modeled as variants only when they affect identity or compatibility.
- Time-sensitive values such as current price or current sales status are modeled as facts, not core entity fields.
- Relationships between entities are first-class and typed.

## Entity ID Format

Entity IDs use this format:

```text
<namespace>:<slug>
```

Examples:

```text
product-line:iphone
product-generation:iphone-15-series
product:iphone-15-pro
variant:iphone-15-pro-a3101
chip:a17-pro
os:ios-17
feature:dynamic-island
event:apple-event-2023-09
```

Rules:

- Use lowercase ASCII slugs.
- Use hyphens between words.
- Prefer Apple marketing names when they are stable and unambiguous.
- Add a disambiguating suffix only when needed.
- Never encode mutable status into an ID.
- Never rename an entity ID after facts or pages depend on it. Use aliases or redirects instead.

## Core Entity Types

### ProductLine

A long-lived Apple product family.

Examples:

- `product-line:iphone`
- `product-line:ipad`
- `product-line:mac`
- `product-line:apple-watch`
- `product-line:airpods`
- `product-line:vision-pro`

### ProductGeneration

A named generation, series, or family grouping within a product line.

Examples:

- `product-generation:iphone-15-series`
- `product-generation:macbook-pro-m3-2023`
- `product-generation:apple-watch-series-9`

Use this type when Apple or common usage treats a group as a comparable generation.

### Product

A specific marketed Apple product.

Examples:

- `product:iphone-15-pro`
- `product:iphone-15-pro-max`
- `product:macbook-air-13-m3`
- `product:apple-watch-ultra-2`
- `product:airpods-pro-2`

Products should represent the level at which users commonly ask questions and compare devices.

### Variant

A region, model, configuration, or hardware variant that needs separate identity.

Examples:

- `variant:iphone-15-pro-a3101`
- `variant:macbook-air-13-m3-8cpu-8gpu`

Use variants only when differences affect compatibility, hardware behavior, regulatory support, or source-backed specifications. Do not create variants for every storage or color option unless those options are needed for facts or retrieval.

### Chip

An Apple or Apple-used chip.

Examples:

- `chip:a17-pro`
- `chip:m3`
- `chip:m3-pro`
- `chip:h2`
- `chip:u1`

### OperatingSystem

A major Apple operating system release.

Examples:

- `os:ios-17`
- `os:ipados-17`
- `os:macos-sonoma`
- `os:watchos-10`
- `os:visionos-1`

Patch versions may be modeled separately only when they are required for compatibility or support facts.

### Feature

A named capability, technology, design element, or product feature.

Examples:

- `feature:dynamic-island`
- `feature:action-button`
- `feature:usb-c`
- `feature:face-id`
- `feature:promotion`

### Accessory

An Apple accessory or compatible add-on.

Examples:

- `accessory:apple-pencil-pro`
- `accessory:magic-keyboard-ipad-pro`
- `accessory:magsafe-charger`

### Event

An Apple announcement event or release event.

Examples:

- `event:apple-event-2023-09`
- `event:wwdc-2024`

### SupportPolicy

A support, repair, software, or service policy.

Examples:

- `support-policy:vintage-products`
- `support-policy:obsolete-products`
- `support-policy:ios-security-updates`

### CompatibilityRule

A durable compatibility concept between entities.

Examples:

- `compatibility:apple-pencil-pro-ipad-pro-m4`
- `compatibility:ios-17-supported-iphones`

Compatibility rules may also be represented as facts when they are simple. Use this entity type when a rule has its own source set, explanation, exceptions, or lifecycle.

## Base Entity Fields

Every entity should support these fields:

```yaml
id: product:iphone-15-pro
type: Product
canonical_name: iPhone 15 Pro
summary: >
  A 2023 Apple smartphone in the iPhone 15 series.
status: active
aliases:
  - iPhone 15 Pro
  - iPhone15,2
external_ids:
  apple_slug: iphone-15-pro
  model_numbers:
    - A3101
first_seen_at: 2023-09-12
last_seen_at: null
created_at: 2026-06-10
updated_at: 2026-06-10
source_ids:
  - source:apple-tech-specs-iphone-15-pro
```

Required base fields:

- `id`
- `type`
- `canonical_name`
- `status`
- `created_at`
- `updated_at`

Optional base fields:

- `summary`
- `aliases`
- `external_ids`
- `first_seen_at`
- `last_seen_at`
- `source_ids`

## Entity Status

Entity status describes lifecycle at the identity level, not sales status.

Allowed values:

- `active`
- `historical`
- `deprecated`
- `merged`
- `redirect`

Sales status, support status, and availability should be facts because they can vary by time and locale.

`needs_review` must not be used as a production entity status. Entity review state belongs to candidate entity records, review queues, and review decisions. A production entity must have one of the lifecycle statuses above.

## Relationships

Relationships are typed links between entities.

Example:

```yaml
relationships:
  - type: belongs_to_line
    target: product-line:iphone
  - type: belongs_to_generation
    target: product-generation:iphone-15-series
  - type: uses_chip
    target: chip:a17-pro
  - type: introduced_at
    target: event:apple-event-2023-09
  - type: supports_os
    target: os:ios-17
  - type: has_feature
    target: feature:dynamic-island
```

Common relationship types:

- `belongs_to_line`
- `belongs_to_generation`
- `has_variant`
- `variant_of`
- `uses_chip`
- `runs_os`
- `supports_os`
- `introduced_at`
- `replaced_by`
- `replaces`
- `has_feature`
- `compatible_with`
- `requires`
- `part_of`

Relationship records may reference source IDs when the relationship is source-backed and important for retrieval.

## Locale and Region

Entities should be global by default.

Use locale or region-specific variants only when identity-level differences exist, such as:

- Different model numbers with different cellular bands
- Different regulatory hardware behavior
- Different bundled accessories
- Different product availability under a distinct marketed form

Locale-specific prices, trade-in values, sales pages, and support wording should be modeled as facts or sources, not separate product entities.

## Aliases and Redirects

Aliases support search and matching. They do not create new identities.

Redirect entities may be used when:

- An early entity ID was replaced.
- A common name maps to a canonical entity.
- A duplicate entity was merged.

Example:

```yaml
id: product:iphone-fifteen-pro
type: Product
canonical_name: iPhone 15 Pro
status: redirect
redirect_to: product:iphone-15-pro
```

## Example Product Entity

```yaml
id: product:iphone-15-pro
type: Product
canonical_name: iPhone 15 Pro
summary: >
  A 2023 iPhone model with A17 Pro, titanium design, USB-C, Action button,
  and Pro camera system.
status: historical
aliases:
  - iPhone 15 Pro
  - iPhone15,2
external_ids:
  model_numbers:
    - A2848
    - A3101
    - A3102
    - A3104
first_seen_at: 2023-09-12
source_ids:
  - source:apple-tech-specs-iphone-15-pro
relationships:
  - type: belongs_to_line
    target: product-line:iphone
  - type: belongs_to_generation
    target: product-generation:iphone-15-series
  - type: uses_chip
    target: chip:a17-pro
  - type: introduced_at
    target: event:apple-event-2023-09
  - type: has_feature
    target: feature:dynamic-island
  - type: has_feature
    target: feature:action-button
```

## Example Chip Entity

```yaml
id: chip:a17-pro
type: Chip
canonical_name: A17 Pro
summary: >
  An Apple-designed chip introduced with iPhone 15 Pro models.
status: historical
aliases:
  - Apple A17 Pro
first_seen_at: 2023-09-12
relationships:
  - type: introduced_at
    target: event:apple-event-2023-09
```

## Consequences

Benefits:

- Stable entity IDs make facts, pages, and citations easier to maintain.
- The schema supports precise product comparison without relying only on prose.
- Aliases and redirects allow search flexibility without weakening canonical identity.
- Variants can represent real hardware differences without exploding the product model.
- Locale-specific and time-sensitive details stay in facts where freshness can be tracked.

Costs:

- Ingestion needs entity resolution before facts can be attached.
- Some Apple naming patterns require manual review.
- Variant boundaries require judgment and may need correction over time.
- Entity redirects and merges must be handled carefully to avoid broken references.

## Alternatives Considered

### Product-Only Entity Model

Rejected because Apple knowledge also depends on chips, operating systems, features, events, accessories, and compatibility rules.

### Page Title as Entity ID

Rejected because names can change, collide, or vary by locale. Stable typed IDs are safer for facts and retrieval.

### Fully Normalized Variant Model

Rejected because creating entities for every color, storage size, and retail configuration would make the graph noisy. Variants should exist only when identity-level differences matter.

## Follow-up Work

- Define fact schema in ADR-003.
- Define source trust levels in ADR-004.
- Define entity resolution rules for ingestion.
- Define redirect and merge procedures.
