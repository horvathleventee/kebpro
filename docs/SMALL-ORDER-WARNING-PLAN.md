# Small-order warning: requirements and implementation plan

## Agreed behavior

Accept orders even when they do not meet the quantity rules. Warn the partner that the quantity may be insufficient for delivery and that Kebpro may call to discuss it. The warning must not prevent submission or promise a call. Existing requirements, such as valid prices and ordering deadlines, still apply.

The **20 kg rule applies to products other than the five listed below**. The **two-carton rule applies to these five product variants**:

| Product | Package |
| --- | --- |
| E.h. sült csirke comb kebab | 1.5 kg/bag, 9 kg/carton |
| Gy.f. sült csirke comb kebab | 1 kg/bag, 10 kg/carton |
| Gy.f. sült csirke comb kebab | 1.5 kg/bag, 9 kg/carton |
| Gy.f. sült marhahúsos kebab | 1 kg/bag, 8 kg/carton |
| Gy.f. pulled pork - tépett sertéshús | 1 kg/bag, 8 kg/carton |

Eligible cartons from different products or variants can be combined. Exactly 20 kg or two eligible cartons meets the corresponding threshold. The 20 kg rule is not restricted to meat: the owner's latest instruction is that it applies to everything except the listed products, subject to determining a product's weight.

Three kebab products are ordered as **NYÁRS** (spits): Csirke kebab, Csirke kebab félbőrös and Marha kebab EU. For each, the partner must select the weight per spit and the number of spits. Show “NYÁRS” for these products. Their contribution to the 20 kg calculation is weight per spit multiplied by the number of spits. For example, two 5 kg spits total 10 kg and trigger the warning; two 10 kg spits total 20 kg and meet the threshold. The warning does not block either order.

If an order's relevant weight cannot be determined, flag it for possible telephone follow-up in the same way as an order that does not meet the rules. Do not falsely state that the order definitely fails the threshold.

The partner settings must contain an editable contact person's phone number. Every admin order shows the number from those settings, including orders that meet the threshold. A missing number must be clearly indicated.

## Partner experience

- Display the size in kg and the number of spits for each NYÁRS product. Preserve both values and their calculated total weight in the cart, review, submitted order and subsequent edits.
- Show a warning in the cart and final order review when the order falls below the applicable rules, updating it as products, variants or quantities change. Keep submission available.
- Suggested Hungarian warning: “A rendelt mennyiség várhatóan nem elegendő a kiszállításhoz. Rendelésedet elküldheted, de előfordulhat, hogy a Kebpro munkatársa telefonon felkeres egyeztetés céljából.”
- For unknown weight, explain that the quantity requires review and that Kebpro may call. Keep submission available.
- Provide an editable contact phone number in partner settings and display a clear success or validation message when it is changed.

## Admin experience

- Show a prominent text label on orders requiring possible follow-up, including orders whose weight is unknown. Distinguish below-threshold and unknown-weight reasons where possible. Show the label in both new and archived views and do not rely on color alone.
- Show the current contact phone number from partner settings on every order, with a callable link on mobile where practical. Display “Nincs megadva telefonszám” when absent. Restrict this information to authorized staff and the owning partner's settings.
- Recalculate the order status when its contents are edited. Archiving and restoring must retain the appropriate status.

## Rule details to settle before implementation

The owner's decisions above establish which rules apply to which products. These remaining details affect correct calculation and should be confirmed before implementation:

1. **Mixed orders:** when an order contains both product groups, must each nonempty group independently meet its own threshold, or can either group's threshold qualify the entire order? For example, should 20 kg of NYÁRS plus one eligible carton trigger a warning? Similarly, should two eligible cartons plus a small quantity of another product trigger one?
2. **Weights for other products:** which products have known weights per ordering unit, and how should weight be provided for products sold by package, bag, piece or carton? If unavailable, use the agreed unknown-weight follow-up status.
3. **NYÁRS choices and pricing:** confirm available weights per spit, whether different sizes of the same product can appear as separate order lines, and whether prices are per kg or per spit. The catalog describes sizes from 5 to 50 kg, but the allowed increments and prices need confirmation.
4. **Variant identity:** the catalog currently has two entries with the same name “Gy.f. sült csirke comb kebab” but different carton weights. They need distinct selectable variants or identifiers so their package information is preserved. Both qualify for the carton rule.
5. **Contact phone details:** confirm validation requirements and whether the number is required. Until specified, show a clear missing-number fallback and use the current setting for all orders.

## Implementation approach

1. **Product and variant data.** Assign explicit, stable product/variant identifiers, threshold group and known weight per ordering unit. Represent the two similarly named frozen chicken kebab packages as separate variants. Do not infer eligibility from free-text names or treat all cartons as 10 kg.
2. **NYÁRS ordering.** Add validated weight-per-spit and quantity inputs for the three specified products, with an obvious NYÁRS label. Persist both values and calculate total weight on the server. Update cart line identity and duplicate-product validation if multiple sizes may be ordered. Apply the approved price basis without silently converting prices.
3. **Threshold calculation.** Implement a tested server-authoritative calculation that distinguishes the 20 kg group, the eligible two-carton group and unknown weights. Return status and reason, including possible follow-up for unknown weight. Apply the approved mixed-order rule. Keep partner-side display consistent with server results.
4. **Submission and edits.** Replace the hard rejection in `portal/domain.js` with the follow-up assessment. Derive the assessment from validated server-side items rather than trusting a client flag. Recalculate on creation and modification while preserving authorization, pricing and deadline checks.
5. **Order history.** Preserve selected variants, NYÁRS weights and quantities so a saved order can be interpreted reliably. Define whether status is stored as an order-time snapshot or recalculated when product rules change; edits must update it. Existing records with insufficient details should be marked for review. The current environment contains test data, so agreed test records may be reset before launch.
6. **Contact settings and staff views.** Add or adapt the owning partner's editable contact phone setting, validate and persist it, and deliver it to authorized staff order views. Use the current setting as requested, unless the owner decides otherwise. Inspect existing partner/user phone fallback logic to avoid conflicting sources. Expose only the owner's number to the partner and only authorized staff data to staff.
7. **Pricing and promotions.** Align staff price settings and promotions with the final product variants and order units. Verify prices before launch rather than assuming conversions from test prices.

## Acceptance checks

- Two 5 kg NYÁRS produce 10 kg and a warning; two 10 kg NYÁRS produce 20 kg and meet the weight threshold. In both cases the order can be submitted. Check all three NYÁRS products, invalid weights and quantities, saved lists, drafts, order edits and staff displays.
- Exactly 20 kg and amounts above and below it produce the expected result for the applicable product group. Test product units whose weights are known and unknown.
- One eligible carton does not meet the carton rule; two eligible cartons do. Test mixed eligible products, both chicken-kebab package variants, and frozen pulled pork. Products outside the list do not contribute to the two-carton count.
- Test mixed-group orders against the confirmed rule. An unknown relevant weight triggers possible telephone follow-up without blocking submission or claiming a definite failure.
- Cart edits and submitted-order edits update the correct assessment; new, archived and restored staff views show it consistently.
- A partner can change their contact phone number; every authorized staff order view shows the current setting. Test absent and invalid numbers and partner isolation.
- Existing price, authorization, deadline and idempotency checks continue to work. Update existing test fixtures, include new tests in the standard partner test command, run it and the TypeScript check, and perform desktop and mobile end-to-end walkthroughs.

## Execution sequence

1. Confirm the remaining mixed-order, weight, variant, pricing and phone-validation details.
2. Model product groups, variants and NYÁRS weights; implement and test the server-side assessment.
3. Replace the minimum rejection and update order creation, editing, saved lists and drafts.
4. Implement the partner warning, editable contact phone, staff follow-up labels and phone display.
5. Prepare agreed test data and prices; run automated checks and walk through the complete partner and staff flows.

This document is a plan. It does not change the portal's behavior.
