# ADR-021: Predicate Role and Entity Type Constraints

## Status

Accepted

## Date

2026-06-11

## Context

ADR-003 defines predicates as normalized snake_case verbs or verb phrases. ADR-018 requires entity resolution to verify that resolved entity types match the predicate role.

The missing decision is the predicate role registry: which entity types are allowed as a fact subject, which entity types are allowed as a fact object, and whether the object is required.

Without this registry, entity resolution and promotion validation cannot reliably reject facts such as:

```yaml
subject: chip:a17-pro
predicate: uses_chip
object: product:iphone-15-pro
```

The entity IDs may be valid, but the predicate role is wrong.

## Decision

Define a predicate role registry. Promotion validation must check production facts against this registry.

Each predicate definition should include:

- predicate name
- allowed subject entity types
- whether an object is required
- allowed object entity types when object is required
- allowed value types
- allowed enum values when `enum` is an allowed value type
- allowed unit dimensions when applicable
- whether the predicate is temporal
- whether locale or region is required, optional, or prohibited
- whether derived facts may use the predicate
- predicate status
- preferred predicate when the predicate is a legacy alias

The registry should be versioned data, not scattered parser logic.

## Locale Policy Values

Allowed `locale_policy` values:

- `required`: production facts using this predicate must include locale or region.
- `optional`: production facts may be global, but locale or region must be present when the claim scope is region-specific.
- `prohibited`: production facts using this predicate must not include locale or region because the claim is global by definition.

Do not introduce additional locale policy enum values without updating this ADR and promotion validation.

## Predicate Status Values

Allowed predicate `status` values:

- `active`: allowed for new candidate and production facts.
- `legacy_alias`: accepted for backward compatibility, but new candidate facts should prefer `preferred_predicate`.
- `deprecated`: not allowed for new production facts except as historical data explicitly approved by review.

Predicates with `status: legacy_alias` must define `preferred_predicate`.

## Predicate Definition Format

Example:

```yaml
predicate: uses_chip
subject_types:
  - Product
  - Variant
object_required: true
object_types:
  - Chip
value_types:
  - entity
unit_dimensions: []
temporal: false
locale_policy: optional
derived_allowed: false
status: active
preferred_predicate: null
```

## Enum Value Sets

Enum-valued predicates use a closed `allowed_values` set stored in the registry.
Promotion validation rejects any production fact whose enum `value` is not in
the predicate's `allowed_values`. Adding or removing an enum value requires
updating this ADR and promotion validation, the same discipline applied to
locale policy and predicate status values.

`has_support_status`:

- `supported`: still within service, repair, or software support.
- `vintage`: Apple vintage product status.
- `obsolete`: Apple obsolete product status.
- `unsupported`: no longer receives support or updates, including OS versions
  past their support window.

`has_sales_status`:

- `available`: currently sold by Apple.
- `preorder`: announced with open pre-orders, not yet shipping.
- `announced`: announced but not yet orderable.
- `sold_out`: temporarily unavailable.
- `discontinued`: no longer sold by Apple.

`compatible_with`:

- `compatible`: fully compatible.
- `incompatible`: not compatible.
- `partial`: compatible with conditions or limitations; record the condition in
  `qualifiers`, for example `requires_os`.

## Initial Predicate Role Registry

Identity and grouping:

```yaml
- predicate: belongs_to_line
  subject_types: [Product, ProductGeneration, Variant]
  object_required: true
  object_types: [ProductLine]
  value_types: [entity]

- predicate: belongs_to_generation
  subject_types: [Product, Variant]
  object_required: true
  object_types: [ProductGeneration]
  value_types: [entity]

- predicate: has_variant
  subject_types: [Product]
  object_required: true
  object_types: [Variant]
  value_types: [entity]

- predicate: variant_of
  subject_types: [Variant]
  object_required: true
  object_types: [Product]
  value_types: [entity]
```

Hardware and features:

```yaml
- predicate: uses_chip
  subject_types: [Product, Variant]
  object_required: true
  object_types: [Chip]
  value_types: [entity]

- predicate: has_feature
  subject_types: [Product, ProductGeneration, Variant, Chip, OperatingSystem, Accessory]
  object_required: true
  object_types: [Feature]
  value_types: [entity]

- predicate: has_display_size
  subject_types: [Product, Variant]
  object_required: false
  object_types: []
  value_types: [number]
  unit_dimensions: [length]

- predicate: has_weight
  subject_types: [Product, Variant, Accessory]
  object_required: false
  object_types: []
  value_types: [number]
  unit_dimensions: [mass]
```

Dates and events:

```yaml
- predicate: introduced_at
  subject_types: [Product, ProductGeneration, Chip, OperatingSystem, Accessory, Feature]
  object_required: true
  object_types: [Event]
  value_types: [entity]

- predicate: announced_at
  subject_types: [Product, ProductGeneration, Chip, OperatingSystem, Accessory, Feature]
  object_required: true
  object_types: [Event]
  value_types: [entity]
  status: legacy_alias
  preferred_predicate: introduced_at

- predicate: has_announcement_date
  subject_types: [Product, ProductGeneration, Chip, OperatingSystem, Accessory, Feature, Event]
  object_required: false
  object_types: []
  value_types: [date]

- predicate: has_release_date
  subject_types: [Product, ProductGeneration, OperatingSystem, Accessory]
  object_required: false
  object_types: []
  value_types: [date]
  locale_policy: optional
```

`introduced_at` is the preferred relationship predicate for linking an entity to
an announcement or launch event. `has_announcement_date` is the scalar date
predicate. `announced_at` is retained as a legacy alias for ADR compatibility,
but new facts should use `introduced_at` unless a later ADR narrows the
semantics.

Compatibility and requirements:

```yaml
- predicate: compatible_with
  subject_types: [Product, Variant, Accessory, OperatingSystem, Feature]
  object_required: true
  object_types: [Product, ProductGeneration, Variant, Accessory, OperatingSystem, Feature]
  value_types: [enum]
  allowed_values: [compatible, incompatible, partial]
  locale_policy: optional

- predicate: requires
  subject_types: [Product, Variant, Accessory, OperatingSystem, Feature, CompatibilityRule]
  object_required: true
  object_types: [Product, ProductGeneration, Variant, Accessory, OperatingSystem, Feature, Chip]
  value_types: [entity]
```

Operating systems and support:

```yaml
- predicate: runs_os
  subject_types: [Product, Variant]
  object_required: true
  object_types: [OperatingSystem]
  value_types: [entity]

- predicate: supports_os
  subject_types: [Product, ProductGeneration, Variant]
  object_required: true
  object_types: [OperatingSystem]
  value_types: [entity]

- predicate: has_support_status
  subject_types: [Product, ProductGeneration, Variant, Accessory, OperatingSystem]
  object_required: false
  object_types: []
  value_types: [enum]
  allowed_values: [supported, vintage, obsolete, unsupported]
  temporal: true
  locale_policy: optional
  notes: Covers product support, repair, vintage, and obsolete product status plus OS support lifecycle states. `supported` means still within service, repair, or software support; `vintage` and `obsolete` follow Apple product lifecycle status; `unsupported` covers products or OS versions that no longer receive support or updates.
```

Lifecycle and availability:

```yaml
- predicate: has_sales_status
  subject_types: [Product, ProductGeneration, Variant, Accessory]
  object_required: false
  object_types: []
  value_types: [enum]
  allowed_values: [available, preorder, announced, sold_out, discontinued]
  temporal: true
  locale_policy: optional
  notes: Region-specific availability or sales status facts must include locale or region.

- predicate: has_price
  subject_types: [Product, Variant, Accessory]
  object_required: false
  object_types: []
  value_types: [money]
  unit_dimensions: [money]
  temporal: true
  locale_policy: required
```

Succession:

```yaml
- predicate: replaced_by
  subject_types: [Product, ProductGeneration, OperatingSystem, Chip, Accessory]
  object_required: true
  object_types: [Product, ProductGeneration, OperatingSystem, Chip, Accessory]
  value_types: [entity]

- predicate: replaces
  subject_types: [Product, ProductGeneration, OperatingSystem, Chip, Accessory]
  object_required: true
  object_types: [Product, ProductGeneration, OperatingSystem, Chip, Accessory]
  value_types: [entity]
```

Derived predicates:

```yaml
- predicate: first_generation_with_feature
  subject_types: [ProductGeneration, ProductLine]
  object_required: true
  object_types: [Feature]
  value_types: [boolean]
  derived_allowed: true
```

## Validation Rules

Promotion validation must reject a candidate fact when:

- predicate is not in the registry
- subject entity type is not allowed for the predicate
- required object is missing
- object is present but object entity type is not allowed
- `value_type` is not allowed for the predicate
- `value_type` is `enum` and the value is not in the predicate's `allowed_values`
- unit dimension does not match the predicate's allowed unit dimensions
- locale or region policy is violated
- a non-derived fact uses a derived-only predicate
- predicate status is `deprecated` and the fact is not explicitly approved as historical

Candidate intake may allow proposed predicates, but proposed predicates must remain in review until the predicate registry is updated or the fact is rewritten with an existing predicate.

Candidate facts using a predicate with `status: legacy_alias` should emit a
non-blocking issue suggesting migration to `preferred_predicate`. Promotion may
proceed only when the candidate is rewritten to the preferred predicate or the
non-blocking issue is explicitly accepted by review.

## Entity Resolution Interaction

Entity resolution must use the predicate role registry when scoring candidates.

Examples:

- For `uses_chip`, a `Chip` object candidate should outrank a `Product` candidate.
- For `belongs_to_generation`, a `ProductGeneration` object candidate should outrank a `ProductLine` candidate.
- For `compatible_with`, multiple entity types may be valid, so context and evidence must determine the target.

If the extracted name resolves confidently to an entity type not allowed by the predicate, the candidate fact must be marked `blocked` or rewritten with the correct predicate.

## Consequences

Benefits:

- Entity resolution has a concrete predicate-role target.
- Promotion validation can reject structurally wrong facts.
- Parser output becomes more consistent.
- Predicate evolution becomes auditable.

Costs:

- The registry must be maintained as predicates are added.
- Some broad predicates, such as `compatible_with`, still need review because multiple entity types are valid.
- Predicate changes may require candidate revalidation.

## Follow-up Work

- Implement predicate registry data.
- Add predicate role validation to promotion.
- Add entity resolution scoring tests using predicate role constraints.
- Add candidate revalidation when predicate definitions change.
- Add `has_trade_in_value` and any other predicate with pending TTL policies to
  the registry before Phase 7.
- Enum value sets for `has_support_status`, `has_sales_status`, and
  `compatible_with` are defined in this ADR; add `allowed_values` for any new
  enum-valued predicate before implementing its ingestion validator.
