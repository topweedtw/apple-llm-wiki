# ADR-020: Unit Registry and Normalization

## Status

Proposed

## Date

2026-06-11

## Context

ADR-003, ADR-008, ADR-011, and ADR-016 require normalized units for production facts. They do not define the allowed unit values or alias rules.

Without a unit registry, parsers may emit different values for the same unit, such as `inch`, `in`, `inches`, or `"`. Storage and memory units also require clear decimal versus binary semantics, such as `GB` versus `GiB`.

Promotion validation needs a registry so it can decide whether a candidate unit is normalized, needs conversion, or must stay in review.

## Decision

Use a controlled unit registry. Production facts may only use canonical unit IDs from the registry, or `null` when the predicate is unitless.

Candidate facts may contain unnormalized source units, but must record an `unnormalized_unit` issue until the unit is mapped to a canonical unit ID.

The registry should be implemented as versioned data, not hard-coded parser logic. Parsers may use the registry for normalization, and promotion validation must check production fact units against it.

## Canonical Unit Format

Canonical unit IDs use lowercase ASCII where possible.

Rules:

- use singular names for common physical units, such as `inch`
- use established case-sensitive symbols only when case carries technical meaning, such as `GB`, `TB`, `GiB`, and `Hz`
- do not use punctuation aliases as canonical IDs
- do not encode display formatting into the unit ID
- use `null` for entity, enum, boolean, date, datetime, and unitless string facts unless the predicate requires a unit

## Initial Unit Registry

Length and dimensions:

```yaml
- id: inch
  aliases: ["in", "in.", "inch", "inches", "\""]
- id: millimeter
  aliases: ["mm", "millimeter", "millimeters"]
- id: centimeter
  aliases: ["cm", "centimeter", "centimeters"]
- id: meter
  aliases: ["m", "meter", "meters"]
```

Mass:

```yaml
- id: gram
  aliases: ["g", "gram", "grams"]
- id: kilogram
  aliases: ["kg", "kilogram", "kilograms"]
- id: ounce
  aliases: ["oz", "ounce", "ounces"]
- id: pound
  aliases: ["lb", "lbs", "pound", "pounds"]
```

Storage and memory:

```yaml
- id: GB
  aliases: ["GB", "gb", "gigabyte", "gigabytes"]
  semantics: decimal_gigabyte
- id: TB
  aliases: ["TB", "tb", "terabyte", "terabytes"]
  semantics: decimal_terabyte
- id: GiB
  aliases: ["GiB", "gib", "gibibyte", "gibibytes"]
  semantics: binary_gibibyte
- id: TiB
  aliases: ["TiB", "tib", "tebibyte", "tebibytes"]
  semantics: binary_tebibyte
```

Apple product specifications generally use decimal `GB` and `TB` for marketed storage capacities unless the source explicitly uses binary units.

Display, frequency, and electrical:

```yaml
- id: Hz
  aliases: ["Hz", "hz", "hertz"]
- id: kHz
  aliases: ["kHz", "khz", "kilohertz"]
- id: MHz
  aliases: ["MHz", "mhz", "megahertz"]
- id: GHz
  aliases: ["GHz", "ghz", "gigahertz"]
- id: nit
  aliases: ["nit", "nits"]
- id: watt
  aliases: ["W", "w", "watt", "watts"]
- id: watt_hour
  aliases: ["Wh", "wh", "watt-hour", "watt hour", "watt-hours"]
```

Money:

```yaml
- id: USD
  aliases: ["USD", "$", "US dollar", "US dollars"]
- id: TWD
  aliases: ["TWD", "NT$", "NTD", "New Taiwan dollar"]
- id: EUR
  aliases: ["EUR", "€", "euro", "euros"]
- id: JPY
  aliases: ["JPY", "¥", "yen"]
```

Money facts must also carry locale or region when the claim is region-specific.

Counts and ratios:

```yaml
- id: count
  aliases: ["count", "item", "items"]
- id: percent
  aliases: ["%", "percent", "percentage"]
- id: megapixel
  aliases: ["MP", "mp", "megapixel", "megapixels"]
```

## Unit Alias Handling

Parser output should preserve source wording in `raw_value` or evidence and normalize `unit` through the registry.

Examples:

```yaml
raw_value: 6.1-inch display
value: 6.1
unit: inch
```

```yaml
raw_value: 128GB storage
value: 128
unit: GB
```

```yaml
raw_value: 120 Hz refresh rate
value: 120
unit: Hz
```

## Conversion Rules

Unit conversion should be conservative.

Allowed automatic conversions:

- `in`, `inches`, and `"` to `inch`
- `mm` to `millimeter`
- `g` to `gram`
- `kg` to `kilogram`
- casing and spelling aliases listed in the registry

Do not automatically convert between:

- decimal and binary storage units, such as `GB` and `GiB`
- different currencies
- length systems, such as `inch` and `millimeter`, unless a predicate-specific conversion policy is defined
- marketed storage and actual usable storage

When a source provides multiple units, choose the unit that best matches the predicate vocabulary and preserve the source wording in evidence.

## Registry Records

Each unit registry record should support:

```yaml
id: inch
dimension: length
aliases:
  - in
  - inches
  - "\""
canonical_symbol: in
display_name: inch
conversion_group: length
status: active
notes: null
```

Status values:

- `active`
- `deprecated`
- `needs_review`

Deprecated units must not be used for new production facts.

## Validation Rules

Candidate intake validation:

- may accept missing or unnormalized units if an `unnormalized_unit` issue is recorded
- must preserve source wording in `raw_value`, evidence, or snapshot context
- must reject unknown units only when the candidate cannot be reviewed

Promotion validation:

- production fact units must be `null` or an active registry unit ID
- unit must match the predicate vocabulary
- unitless predicates must use `unit: null`
- decimal and binary storage units must not be silently converted
- money facts must include locale or region when region-specific

## Consequences

Benefits:

- Parsers share the same canonical unit IDs.
- Promotion validation has a concrete rule set.
- Storage, memory, money, and display facts avoid silent semantic drift.
- Source wording remains auditable through `raw_value` and evidence.

Costs:

- The registry must be maintained as new unit types appear.
- Predicate definitions must eventually declare allowed unit dimensions.
- Some facts will require review instead of automatic unit conversion.

## Follow-up Work

- Add unit registry data to the implementation.
- Define predicate-to-unit-dimension rules.
- Add parser tests for aliases such as `in`, `"`, `GB`, `GiB`, `Hz`, and `%`.
- Add promotion validation tests for unknown and deprecated units.
