import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { yCollab } from "y-codemirror.next";
import { EditorView, basicSetup, minimalSetup } from "codemirror";

//#region node_modules/@codemirror/state/dist/index.d.ts
/**
A text iterator iterates over a sequence of strings. When
iterating over a [`Text`](https://codemirror.net/6/docs/ref/#state.Text) document, result values will
either be lines or line breaks.
*/
interface TextIterator extends Iterator<string>, Iterable<string> {
  /**
  Retrieve the next string. Optionally skip a given number of
  positions after the current position. Always returns the object
  itself.
  */
  next(skip?: number): this;
  /**
  The current string. Will be the empty string when the cursor is
  at its end or `next` hasn't been called on it yet.
  */
  value: string;
  /**
  Whether the end of the iteration has been reached. You should
  probably check this right after calling `next`.
  */
  done: boolean;
  /**
  Whether the current string represents a line break.
  */
  lineBreak: boolean;
}
/**
The data structure for documents. @nonabstract
*/
declare abstract class Text implements Iterable<string> {
  /**
  The length of the string.
  */
  abstract readonly length: number;
  /**
  The number of lines in the string (always >= 1).
  */
  abstract readonly lines: number;
  /**
  Get the line description around the given position.
  */
  lineAt(pos: number): Line;
  /**
  Get the description for the given (1-based) line number.
  */
  line(n: number): Line;
  /**
  Replace a range of the text with the given content.
  */
  replace(from: number, to: number, text: Text): Text;
  /**
  Append another document to this one.
  */
  append(other: Text): Text;
  /**
  Retrieve the text between the given points.
  */
  slice(from: number, to?: number): Text;
  /**
  Retrieve a part of the document as a string
  */
  abstract sliceString(from: number, to?: number, lineSep?: string): string;
  /**
  Test whether this text is equal to another instance.
  */
  eq(other: Text): boolean;
  /**
  Iterate over the text. When `dir` is `-1`, iteration happens
  from end to start. This will return lines and the breaks between
  them as separate strings.
  */
  iter(dir?: 1 | -1): TextIterator;
  /**
  Iterate over a range of the text. When `from` > `to`, the
  iterator will run in reverse.
  */
  iterRange(from: number, to?: number): TextIterator;
  /**
  Return a cursor that iterates over the given range of lines,
  _without_ returning the line breaks between, and yielding empty
  strings for empty lines.
  
  When `from` and `to` are given, they should be 1-based line numbers.
  */
  iterLines(from?: number, to?: number): TextIterator;
  /**
  Return the document as a string, using newline characters to
  separate lines.
  */
  toString(): string;
  /**
  Convert the document to an array of lines (which can be
  deserialized again via [`Text.of`](https://codemirror.net/6/docs/ref/#state.Text^of)).
  */
  toJSON(): string[];
  /**
  If this is a branch node, `children` will hold the `Text`
  objects that it is made up of. For leaf nodes, this holds null.
  */
  abstract readonly children: readonly Text[] | null;
  /**
  @hide
  */
  [Symbol.iterator]: () => Iterator<string>;
  /**
  Create a `Text` instance for the given array of lines.
  */
  static of(text: readonly string[]): Text;
  /**
  The empty document.
  */
  static empty: Text;
}
/**
This type describes a line in the document. It is created
on-demand when lines are [queried](https://codemirror.net/6/docs/ref/#state.Text.lineAt).
*/
declare class Line {
  /**
  The position of the start of the line.
  */
  readonly from: number;
  /**
  The position at the end of the line (_before_ the line break,
  or at the end of document for the last line).
  */
  readonly to: number;
  /**
  This line's line number (1-based).
  */
  readonly number: number;
  /**
  The line's content.
  */
  readonly text: string;
  /**
  The length of the line (not including any line break after it).
  */
  get length(): number;
}
/**
Distinguishes different ways in which positions can be mapped.
*/
declare enum MapMode {
  /**
  Map a position to a valid new position, even when its context
  was deleted.
  */
  Simple = 0,
  /**
  Return null if deletion happens across the position.
  */
  TrackDel = 1,
  /**
  Return null if the character _before_ the position is deleted.
  */
  TrackBefore = 2,
  /**
  Return null if the character _after_ the position is deleted.
  */
  TrackAfter = 3
}
/**
A change description is a variant of [change set](https://codemirror.net/6/docs/ref/#state.ChangeSet)
that doesn't store the inserted text. As such, it can't be
applied, but is cheaper to store and manipulate.
*/
declare class ChangeDesc {
  /**
  The length of the document before the change.
  */
  get length(): number;
  /**
  The length of the document after the change.
  */
  get newLength(): number;
  /**
  False when there are actual changes in this set.
  */
  get empty(): boolean;
  /**
  Iterate over the unchanged parts left by these changes. `posA`
  provides the position of the range in the old document, `posB`
  the new position in the changed document.
  */
  iterGaps(f: (posA: number, posB: number, length: number) => void): void;
  /**
  Iterate over the ranges changed by these changes. (See
  [`ChangeSet.iterChanges`](https://codemirror.net/6/docs/ref/#state.ChangeSet.iterChanges) for a
  variant that also provides you with the inserted text.)
  `fromA`/`toA` provides the extent of the change in the starting
  document, `fromB`/`toB` the extent of the replacement in the
  changed document.
  
  When `individual` is true, adjacent changes (which are kept
  separate for [position mapping](https://codemirror.net/6/docs/ref/#state.ChangeDesc.mapPos)) are
  reported separately.
  */
  iterChangedRanges(f: (fromA: number, toA: number, fromB: number, toB: number) => void, individual?: boolean): void;
  /**
  Get a description of the inverted form of these changes.
  */
  get invertedDesc(): ChangeDesc;
  /**
  Compute the combined effect of applying another set of changes
  after this one. The length of the document after this set should
  match the length before `other`.
  */
  composeDesc(other: ChangeDesc): ChangeDesc;
  /**
  Map this description, which should start with the same document
  as `other`, over another set of changes, so that it can be
  applied after it. When `before` is true, map as if the changes
  in `this` happened before the ones in `other`.
  */
  mapDesc(other: ChangeDesc, before?: boolean): ChangeDesc;
  /**
  Map a given position through these changes, to produce a
  position pointing into the new document.
  
  `assoc` indicates which side the position should be associated
  with. When it is negative, the mapping will try to keep the
  position close to the character before it (if any), and will
  move it before insertions at that point or replacements across
  that point. When it is zero or positive, the position is associated
  with the character after it, and will be moved forward for
  */
  /**
  
  `mode` determines whether deletions should be
  [reported](https://codemirror.net/6/docs/ref/#state.MapMode). It defaults to
  [`MapMode.Simple`](https://codemirror.net/6/docs/ref/#state.MapMode.Simple) (don't report
  deletions).
  */
  mapPos(pos: number, assoc?: number): number;
  mapPos(pos: number, assoc: number, mode: MapMode): number | null;
  /**
  Check whether these changes touch a given range. When one of the
  changes entirely covers the range, the string `"cover"` is
  returned.
  */
  touchesRange(from: number, to?: number): boolean | "cover";
  /**
  Serialize this change desc to a JSON-representable value.
  */
  toJSON(): readonly number[];
  /**
  Create a change desc from its JSON representation (as produced
  by [`toJSON`](https://codemirror.net/6/docs/ref/#state.ChangeDesc.toJSON).
  */
  static fromJSON(json: any): ChangeDesc;
}
/**
This type is used as argument to
[`EditorState.changes`](https://codemirror.net/6/docs/ref/#state.EditorState.changes) and in the
[`changes` field](https://codemirror.net/6/docs/ref/#state.TransactionSpec.changes) of transaction
specs to succinctly describe document changes. It may either be a
plain object describing a change (a deletion, insertion, or
replacement, depending on which fields are present), a [change
set](https://codemirror.net/6/docs/ref/#state.ChangeSet), or an array of change specs.
*/
type ChangeSpec = {
  from: number;
  to?: number;
  insert?: string | Text;
} | ChangeSet | readonly ChangeSpec[];
/**
A change set represents a group of modifications to a document. It
stores the document length, and can only be applied to documents
with exactly that length.
*/
declare class ChangeSet extends ChangeDesc {
  private constructor();
  /**
  Apply the changes to a document, returning the modified
  document.
  */
  apply(doc: Text): Text;
  mapDesc(other: ChangeDesc, before?: boolean): ChangeDesc;
  /**
  Given the document as it existed _before_ the changes, return a
  change set that represents the inverse of this set, which could
  be used to go from the document created by the changes back to
  the document as it existed before the changes.
  */
  invert(doc: Text): ChangeSet;
  /**
  Combine two subsequent change sets into a single set. `other`
  must start in the document produced by `this`. If `this` goes
  `docA` → `docB` and `other` represents `docB` → `docC`, the
  returned value will represent the change `docA` → `docC`.
  */
  compose(other: ChangeSet): ChangeSet;
  /**
  Given another change set starting in the same document, maps this
  change set over the other, producing a new change set that can be
  applied to the document produced by applying `other`. When
  `before` is `true`, order changes as if `this` comes before
  `other`, otherwise (the default) treat `other` as coming first.
  
  Given two changes `A` and `B`, `A.compose(B.map(A))` and
  `B.compose(A.map(B, true))` will produce the same document. This
  provides a basic form of [operational
  transformation](https://en.wikipedia.org/wiki/Operational_transformation),
  and can be used for collaborative editing.
  */
  map(other: ChangeDesc, before?: boolean): ChangeSet;
  /**
  Iterate over the changed ranges in the document, calling `f` for
  each, with the range in the original document (`fromA`-`toA`)
  and the range that replaces it in the new document
  (`fromB`-`toB`).
  
  When `individual` is true, adjacent changes are reported
  separately.
  */
  iterChanges(f: (fromA: number, toA: number, fromB: number, toB: number, inserted: Text) => void, individual?: boolean): void;
  /**
  Get a [change description](https://codemirror.net/6/docs/ref/#state.ChangeDesc) for this change
  set.
  */
  get desc(): ChangeDesc;
  /**
  Serialize this change set to a JSON-representable value.
  */
  toJSON(): any;
  /**
  Create a change set for the given changes, for a document of the
  given length, using `lineSep` as line separator.
  */
  static of(changes: ChangeSpec, length: number, lineSep?: string): ChangeSet;
  /**
  Create an empty changeset of the given length.
  */
  static empty(length: number): ChangeSet;
  /**
  Create a changeset from its JSON representation (as produced by
  [`toJSON`](https://codemirror.net/6/docs/ref/#state.ChangeSet.toJSON).
  */
  static fromJSON(json: any): ChangeSet;
}
/**
A single selection range. When
[`allowMultipleSelections`](https://codemirror.net/6/docs/ref/#state.EditorState^allowMultipleSelections)
is enabled, a [selection](https://codemirror.net/6/docs/ref/#state.EditorSelection) may hold
multiple ranges. By default, selections hold exactly one range.
*/
declare class SelectionRange {
  /**
  The lower boundary of the range.
  */
  readonly from: number;
  /**
  The upper boundary of the range.
  */
  readonly to: number;
  private flags;
  /**
  The goal column (stored vertical offset) associated with a
  cursor. This is used to preserve the vertical position when
  [moving](https://codemirror.net/6/docs/ref/#view.EditorView.moveVertically) across
  lines of different length.
  */
  readonly goalColumn: number | undefined;
  private constructor();
  /**
  The anchor of the range—the side that doesn't move when you
  extend it.
  */
  get anchor(): number;
  /**
  The head of the range, which is moved when the range is
  [extended](https://codemirror.net/6/docs/ref/#state.SelectionRange.extend).
  */
  get head(): number;
  /**
  True when `anchor` and `head` are at the same position.
  */
  get empty(): boolean;
  /**
  If this is a cursor that is explicitly associated with the
  character on one of its sides, this returns the side. -1 means
  the character before its position, 1 the character after, and 0
  means no association.
  */
  get assoc(): -1 | 0 | 1;
  /**
  A flag that, when set, makes some selection-extending commands
  treat the range's head and anchor as exchangeable, so that for
  example Shift-ArrowUp will make the lower side of the selection
  the anchor, even if that was the head before. Used to implement
  MacOS-style undirectional selections.
  */
  get undirectional(): boolean;
  /**
  The bidirectional text level associated with this cursor, if
  any.
  */
  get bidiLevel(): number | null;
  /**
  Map this range through a change, producing a valid range in the
  updated document.
  */
  map(change: ChangeDesc, assoc?: number): SelectionRange;
  /**
  Extend this range to cover at least `from` to `to`.
  */
  extend(from: number, to?: number, assoc?: number): SelectionRange;
  /**
  Compare this range to another range.
  */
  eq(other: SelectionRange, includeAssoc?: boolean): boolean;
  /**
  Return a JSON-serializable object representing the range.
  */
  toJSON(): any;
  /**
  Convert a JSON representation of a range to a `SelectionRange`
  instance.
  */
  static fromJSON(json: any): SelectionRange;
}
/**
An editor selection holds one or more selection ranges.
*/
declare class EditorSelection {
  /**
  The ranges in the selection, sorted by position. Ranges cannot
  overlap (but they may touch, if they aren't empty).
  */
  readonly ranges: readonly SelectionRange[];
  /**
  The index of the _main_ range in the selection (which is
  usually the range that was added last).
  */
  readonly mainIndex: number;
  private constructor();
  /**
  Map a selection through a change. Used to adjust the selection
  position for changes.
  */
  map(change: ChangeDesc, assoc?: number): EditorSelection;
  /**
  Compare this selection to another selection. By default, ranges
  are compared only by position. When `includeAssoc` is true,
  cursor ranges must also have the same
  [`assoc`](https://codemirror.net/6/docs/ref/#state.SelectionRange.assoc) value.
  */
  eq(other: EditorSelection, includeAssoc?: boolean): boolean;
  /**
  Get the primary selection range. Usually, you should make sure
  your code applies to _all_ ranges, by using methods like
  [`changeByRange`](https://codemirror.net/6/docs/ref/#state.EditorState.changeByRange).
  */
  get main(): SelectionRange;
  /**
  Make sure the selection only has one range. Returns a selection
  holding only the main range from this selection.
  */
  asSingle(): EditorSelection;
  /**
  Extend this selection with an extra range.
  */
  addRange(range: SelectionRange, main?: boolean): EditorSelection;
  /**
  Replace a given range with another range, and then normalize the
  selection to merge and sort ranges if necessary.
  */
  replaceRange(range: SelectionRange, which?: number): EditorSelection;
  /**
  Convert this selection to an object that can be serialized to
  JSON.
  */
  toJSON(): any;
  /**
  Create a selection from a JSON representation.
  */
  static fromJSON(json: any): EditorSelection;
  /**
  Create a selection holding a single range.
  */
  static single(anchor: number, head?: number): EditorSelection;
  /**
  Sort and merge the given set of ranges, creating a valid
  selection.
  */
  static create(ranges: readonly SelectionRange[], mainIndex?: number): EditorSelection;
  /**
  Create a cursor selection range at the given position. You can
  safely ignore the optional arguments in most situations.
  */
  static cursor(pos: number, assoc?: number, bidiLevel?: number, goalColumn?: number): SelectionRange;
  /**
  Create a selection range.
  */
  static range(anchor: number, head: number, goalColumn?: number, bidiLevel?: number, assoc?: number): SelectionRange;
  /**
  Create an [undirectional](https://codemirror.net/6/docs/ref/#state.SelectionRange.undirectional)
  selection range.
  */
  static undirectionalRange(from: number, to: number): SelectionRange;
}
type FacetConfig<Input, Output> = {
  /**
  How to combine the input values into a single output value. When
  not given, the array of input values becomes the output. This
  function will immediately be called on creating the facet, with
  an empty array, to compute the facet's default value when no
  inputs are present.
  */
  combine?: (value: readonly Input[]) => Output;
  /**
  How to compare output values to determine whether the value of
  the facet changed. Defaults to comparing by `===` or, if no
  `combine` function was given, comparing each element of the
  array with `===`.
  */
  compare?: (a: Output, b: Output) => boolean;
  /**
  How to compare input values to avoid recomputing the output
  value when no inputs changed. Defaults to comparing with `===`.
  */
  compareInput?: (a: Input, b: Input) => boolean;
  /**
  Forbids dynamic inputs to this facet.
  */
  static?: boolean;
  /**
  If given, these extension(s) (or the result of calling the given
  function with the facet) will be added to any state where this
  facet is provided. (Note that, while a facet's default value can
  be read from a state even if the facet wasn't present in the
  state at all, these extensions won't be added in that
  situation.)
  */
  enables?: Extension | ((self: Facet<Input, Output>) => Extension);
};
/**
A facet is a labeled value that is associated with an editor
state. It takes inputs from any number of extensions, and combines
those into a single output value.

Examples of uses of facets are the [tab
size](https://codemirror.net/6/docs/ref/#state.EditorState^tabSize), [editor
attributes](https://codemirror.net/6/docs/ref/#view.EditorView^editorAttributes), and [update
listeners](https://codemirror.net/6/docs/ref/#view.EditorView^updateListener).

Note that `Facet` instances can be used anywhere where
[`FacetReader`](https://codemirror.net/6/docs/ref/#state.FacetReader) is expected.
*/
declare class Facet<Input, Output = readonly Input[]> implements FacetReader<Output> {
  private isStatic;
  private constructor();
  /**
  Returns a facet reader for this facet, which can be used to
  [read](https://codemirror.net/6/docs/ref/#state.EditorState.facet) it but not to define values for it.
  */
  get reader(): FacetReader<Output>;
  /**
  Define a new facet.
  */
  static define<Input, Output = readonly Input[]>(config?: FacetConfig<Input, Output>): Facet<Input, Output>;
  /**
  Returns an extension that adds the given value to this facet.
  */
  of(value: Input): Extension;
  /**
  Create an extension that computes a value for the facet from a
  state. You must take care to declare the parts of the state that
  this value depends on, since your function is only called again
  for a new state when one of those parts changed.
  
  In cases where your value depends only on a single field, you'll
  want to use the [`from`](https://codemirror.net/6/docs/ref/#state.Facet.from) method instead.
  */
  compute(deps: readonly Slot<any>[], get: (state: EditorState) => Input): Extension;
  /**
  Create an extension that computes zero or more values for this
  facet from a state.
  */
  computeN(deps: readonly Slot<any>[], get: (state: EditorState) => readonly Input[]): Extension;
  /**
  Shorthand method for registering a facet source with a state
  field as input. If the field's type corresponds to this facet's
  input type, the getter function can be omitted. If given, it
  will be used to retrieve the input from the field value.
  */
  from<T extends Input>(field: StateField<T>): Extension;
  from<T>(field: StateField<T>, get: (value: T) => Input): Extension;
  tag: Output;
}
/**
A facet reader can be used to fetch the value of a facet, through
[`EditorState.facet`](https://codemirror.net/6/docs/ref/#state.EditorState.facet) or as a dependency
in [`Facet.compute`](https://codemirror.net/6/docs/ref/#state.Facet.compute), but not to define new
values for the facet.
*/
type FacetReader<Output> = {
  /**
  Dummy tag that makes sure TypeScript doesn't consider all object
  types as conforming to this type. Not actually present on the
  object.
  */
  tag: Output;
};
type Slot<T> = FacetReader<T> | StateField<T> | "doc" | "selection";
type StateFieldSpec<Value> = {
  /**
  Creates the initial value for the field when a state is created.
  */
  create: (state: EditorState) => Value;
  /**
  Compute a new value from the field's previous value and a
  [transaction](https://codemirror.net/6/docs/ref/#state.Transaction).
  */
  update: (value: Value, transaction: Transaction) => Value;
  /**
  Compare two values of the field, returning `true` when they are
  the same. This is used to avoid recomputing facets that depend
  on the field when its value did not change. Defaults to using
  `===`.
  */
  compare?: (a: Value, b: Value) => boolean;
  /**
  Provide extensions based on this field. The given function will
  be called once with the initialized field. It will usually want
  to call some facet's [`from`](https://codemirror.net/6/docs/ref/#state.Facet.from) method to
  create facet inputs from this field, but can also return other
  extensions that should be enabled when the field is present in a
  configuration.
  */
  provide?: (field: StateField<Value>) => Extension;
  /**
  A function used to serialize this field's content to JSON. Only
  necessary when this field is included in the argument to
  [`EditorState.toJSON`](https://codemirror.net/6/docs/ref/#state.EditorState.toJSON).
  */
  toJSON?: (value: Value, state: EditorState) => any;
  /**
  A function that deserializes the JSON representation of this
  field's content.
  */
  fromJSON?: (json: any, state: EditorState) => Value;
};
/**
Fields can store additional information in an editor state, and
keep it in sync with the rest of the state.
*/
declare class StateField<Value> {
  private createF;
  private updateF;
  private compareF;
  private constructor();
  /**
  Define a state field.
  */
  static define<Value>(config: StateFieldSpec<Value>): StateField<Value>;
  private create;
  /**
  Returns an extension that enables this field and overrides the
  way it is initialized. Can be useful when you need to provide a
  non-default starting value for the field.
  */
  init(create: (state: EditorState) => Value): Extension;
  /**
  State field instances can be used as
  [`Extension`](https://codemirror.net/6/docs/ref/#state.Extension) values to enable the field in a
  given state.
  */
  get extension(): Extension;
}
/**
Extension values can be
[provided](https://codemirror.net/6/docs/ref/#state.EditorStateConfig.extensions) when creating a
state to attach various kinds of configuration and behavior
information. They can either be built-in extension-providing
objects, such as [state fields](https://codemirror.net/6/docs/ref/#state.StateField) or [facet
providers](https://codemirror.net/6/docs/ref/#state.Facet.of), or objects with an extension in its
`extension` property. Extensions can be nested in arrays
arbitrarily deep—they will be flattened when processed.
*/
type Extension = {
  extension: Extension;
} | readonly Extension[];
/**
By default extensions are registered in the order they are found
in the flattened form of nested array that was provided.
Individual extension values can be assigned a precedence to
override this. Extensions that do not have a precedence set get
the precedence of the nearest parent with a precedence, or
[`default`](https://codemirror.net/6/docs/ref/#state.Prec.default) if there is no such parent. The
final ordering of extensions is determined by first sorting by
precedence and then by order within each precedence.
*/
/**
Annotations are tagged values that are used to add metadata to
transactions in an extensible way. They should be used to model
things that effect the entire transaction (such as its [time
stamp](https://codemirror.net/6/docs/ref/#state.Transaction^time) or information about its
[origin](https://codemirror.net/6/docs/ref/#state.Transaction^userEvent)). For effects that happen
_alongside_ the other changes made by the transaction, [state
effects](https://codemirror.net/6/docs/ref/#state.StateEffect) are more appropriate.
*/
declare class Annotation<T> {
  /**
  The annotation type.
  */
  readonly type: AnnotationType<T>;
  /**
  The value of this annotation.
  */
  readonly value: T;
  /**
  Define a new type of annotation.
  */
  static define<T>(): AnnotationType<T>;
  private _isAnnotation;
}
/**
Marker that identifies a type of [annotation](https://codemirror.net/6/docs/ref/#state.Annotation).
*/
declare class AnnotationType<T> {
  /**
  Create an instance of this annotation.
  */
  of(value: T): Annotation<T>;
}
interface StateEffectSpec<Value> {
  /**
  Provides a way to map an effect like this through a position
  mapping. When not given, the effects will simply not be mapped.
  When the function returns `undefined`, that means the mapping
  deletes the effect.
  */
  map?: (value: Value, mapping: ChangeDesc) => Value | undefined;
}
/**
Representation of a type of state effect. Defined with
[`StateEffect.define`](https://codemirror.net/6/docs/ref/#state.StateEffect^define).
*/
declare class StateEffectType<Value> {
  /**
  @internal
  */
  readonly map: (value: any, mapping: ChangeDesc) => any | undefined;
  /**
  Create a [state effect](https://codemirror.net/6/docs/ref/#state.StateEffect) instance of this
  type.
  */
  of(value: Value): StateEffect<Value>;
}
/**
State effects can be used to represent additional effects
associated with a [transaction](https://codemirror.net/6/docs/ref/#state.Transaction.effects). They
are often useful to model changes to custom [state
fields](https://codemirror.net/6/docs/ref/#state.StateField), when those changes aren't implicit in
document or selection changes.
*/
declare class StateEffect<Value> {
  /**
  The value of this effect.
  */
  readonly value: Value;
  /**
  Map this effect through a position mapping. Will return
  `undefined` when that ends up deleting the effect.
  */
  map(mapping: ChangeDesc): StateEffect<Value> | undefined;
  /**
  Tells you whether this effect object is of a given
  [type](https://codemirror.net/6/docs/ref/#state.StateEffectType).
  */
  is<T>(type: StateEffectType<T>): this is StateEffect<T>;
  /**
  Define a new effect type. The type parameter indicates the type
  of values that his effect holds. It should be a type that
  doesn't include `undefined`, since that is used in
  [mapping](https://codemirror.net/6/docs/ref/#state.StateEffect.map) to indicate that an effect is
  removed.
  */
  static define<Value = null>(spec?: StateEffectSpec<Value>): StateEffectType<Value>;
  /**
  Map an array of effects through a change set.
  */
  static mapEffects(effects: readonly StateEffect<any>[], mapping: ChangeDesc): readonly StateEffect<any>[];
  /**
  This effect can be used to reconfigure the root extensions of
  the editor. Doing this will discard any extensions
  [appended](https://codemirror.net/6/docs/ref/#state.StateEffect^appendConfig), but does not reset
  the content of [reconfigured](https://codemirror.net/6/docs/ref/#state.Compartment.reconfigure)
  compartments.
  */
  static reconfigure: StateEffectType<Extension>;
  /**
  Append extensions to the top-level configuration of the editor.
  */
  static appendConfig: StateEffectType<Extension>;
}
/**
Describes a [transaction](https://codemirror.net/6/docs/ref/#state.Transaction) when calling the
[`EditorState.update`](https://codemirror.net/6/docs/ref/#state.EditorState.update) method.
*/
interface TransactionSpec {
  /**
  The changes to the document made by this transaction.
  */
  changes?: ChangeSpec;
  /**
  When set, this transaction explicitly updates the selection.
  Offsets in this selection should refer to the document as it is
  _after_ the transaction.
  */
  selection?: EditorSelection | {
    anchor: number;
    head?: number;
  } | undefined;
  /**
  Attach [state effects](https://codemirror.net/6/docs/ref/#state.StateEffect) to this transaction.
  Again, when they contain positions and this same spec makes
  changes, those positions should refer to positions in the
  updated document.
  */
  effects?: StateEffect<any> | readonly StateEffect<any>[];
  /**
  Set [annotations](https://codemirror.net/6/docs/ref/#state.Annotation) for this transaction.
  */
  annotations?: Annotation<any> | readonly Annotation<any>[];
  /**
  Shorthand for `annotations:` [`Transaction.userEvent`](https://codemirror.net/6/docs/ref/#state.Transaction^userEvent)`.of(...)`.
  */
  userEvent?: string;
  /**
  When set to `true`, the transaction is marked as needing to
  scroll the current selection into view.
  */
  scrollIntoView?: boolean;
  /**
  By default, transactions can be modified by [change
  filters](https://codemirror.net/6/docs/ref/#state.EditorState^changeFilter) and [transaction
  filters](https://codemirror.net/6/docs/ref/#state.EditorState^transactionFilter). You can set this
  to `false` to disable that. This can be necessary for
  transactions that, for example, include annotations that must be
  kept consistent with their changes.
  */
  filter?: boolean;
  /**
  Normally, when multiple specs are combined (for example by
  [`EditorState.update`](https://codemirror.net/6/docs/ref/#state.EditorState.update)), the
  positions in `changes` are taken to refer to the document
  positions in the initial document. When a spec has `sequental`
  set to true, its positions will be taken to refer to the
  document created by the specs before it instead.
  */
  sequential?: boolean;
}
/**
Changes to the editor state are grouped into transactions.
Typically, a user action creates a single transaction, which may
contain any number of document changes, may change the selection,
or have other effects. Create a transaction by calling
[`EditorState.update`](https://codemirror.net/6/docs/ref/#state.EditorState.update), or immediately
dispatch one by calling
[`EditorView.dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch).
*/
declare class Transaction {
  /**
  The state from which the transaction starts.
  */
  readonly startState: EditorState;
  /**
  The document changes made by this transaction.
  */
  readonly changes: ChangeSet;
  /**
  The selection set by this transaction, or undefined if it
  doesn't explicitly set a selection.
  */
  readonly selection: EditorSelection | undefined;
  /**
  The effects added to the transaction.
  */
  readonly effects: readonly StateEffect<any>[];
  /**
  Whether the selection should be scrolled into view after this
  transaction is dispatched.
  */
  readonly scrollIntoView: boolean;
  private constructor();
  /**
  The new document produced by the transaction. Contrary to
  [`.state`](https://codemirror.net/6/docs/ref/#state.Transaction.state)`.doc`, accessing this won't
  force the entire new state to be computed right away, so it is
  recommended that [transaction
  filters](https://codemirror.net/6/docs/ref/#state.EditorState^transactionFilter) use this getter
  when they need to look at the new document.
  */
  get newDoc(): Text;
  /**
  The new selection produced by the transaction. If
  [`this.selection`](https://codemirror.net/6/docs/ref/#state.Transaction.selection) is undefined,
  this will [map](https://codemirror.net/6/docs/ref/#state.EditorSelection.map) the start state's
  current selection through the changes made by the transaction.
  */
  get newSelection(): EditorSelection;
  /**
  The new state created by the transaction. Computed on demand
  (but retained for subsequent access), so it is recommended not to
  access it in [transaction
  filters](https://codemirror.net/6/docs/ref/#state.EditorState^transactionFilter) when possible.
  */
  get state(): EditorState;
  /**
  Get the value of the given annotation type, if any.
  */
  annotation<T>(type: AnnotationType<T>): T | undefined;
  /**
  Indicates whether the transaction changed the document.
  */
  get docChanged(): boolean;
  /**
  Indicates whether this transaction reconfigures the state
  (through a [configuration compartment](https://codemirror.net/6/docs/ref/#state.Compartment) or
  with a top-level configuration
  [effect](https://codemirror.net/6/docs/ref/#state.StateEffect^reconfigure).
  */
  get reconfigured(): boolean;
  /**
  Returns true if the transaction has a [user
  event](https://codemirror.net/6/docs/ref/#state.Transaction^userEvent) annotation that is equal to
  or more specific than `event`. For example, if the transaction
  has `"select.pointer"` as user event, `"select"` and
  `"select.pointer"` will match it.
  */
  isUserEvent(event: string): boolean;
  /**
  Annotation used to store transaction timestamps. Automatically
  added to every transaction, holding `Date.now()`.
  */
  static time: AnnotationType<number>;
  /**
  Annotation used to associate a transaction with a user interface
  event. Holds a string identifying the event, using a
  dot-separated format to support attaching more specific
  information. The events used by the core libraries are:
  
   - `"input"` when content is entered
     - `"input.type"` for typed input
       - `"input.type.compose"` for composition
     - `"input.paste"` for pasted input
     - `"input.drop"` when adding content with drag-and-drop
     - `"input.complete"` when autocompleting
   - `"delete"` when the user deletes content
     - `"delete.selection"` when deleting the selection
     - `"delete.forward"` when deleting forward from the selection
     - `"delete.backward"` when deleting backward from the selection
     - `"delete.cut"` when cutting to the clipboard
   - `"move"` when content is moved
     - `"move.drop"` when content is moved within the editor through drag-and-drop
   - `"select"` when explicitly changing the selection
     - `"select.pointer"` when selecting with a mouse or other pointing device
   - `"undo"` and `"redo"` for history actions
  
  Use [`isUserEvent`](https://codemirror.net/6/docs/ref/#state.Transaction.isUserEvent) to check
  whether the annotation matches a given event.
  */
  static userEvent: AnnotationType<string>;
  /**
  Annotation indicating whether a transaction should be added to
  the undo history or not.
  */
  static addToHistory: AnnotationType<boolean>;
  /**
  Annotation indicating (when present and true) that a transaction
  represents a change made by some other actor, not the user. This
  is used, for example, to tag other people's changes in
  collaborative editing.
  */
  static remote: AnnotationType<boolean>;
}
/**
The categories produced by a [character
categorizer](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer). These are used
do things like selecting by word.
*/
declare enum CharCategory {
  /**
  Word characters.
  */
  Word = 0,
  /**
  Whitespace.
  */
  Space = 1,
  /**
  Anything else.
  */
  Other = 2
}
/**
Options passed when [creating](https://codemirror.net/6/docs/ref/#state.EditorState^create) an
editor state.
*/
interface EditorStateConfig {
  /**
  The initial document. Defaults to an empty document. Can be
  provided either as a plain string (which will be split into
  lines according to the value of the [`lineSeparator`
  facet](https://codemirror.net/6/docs/ref/#state.EditorState^lineSeparator)), or an instance of
  the [`Text`](https://codemirror.net/6/docs/ref/#state.Text) class (which is what the state will use
  to represent the document).
  */
  doc?: string | Text;
  /**
  The starting selection. Defaults to a cursor at the very start
  of the document.
  */
  selection?: EditorSelection | {
    anchor: number;
    head?: number;
  };
  /**
  [Extension(s)](https://codemirror.net/6/docs/ref/#state.Extension) to associate with this state.
  */
  extensions?: Extension;
}
/**
The editor state class is a persistent (immutable) data structure.
To update a state, you [create](https://codemirror.net/6/docs/ref/#state.EditorState.update) a
[transaction](https://codemirror.net/6/docs/ref/#state.Transaction), which produces a _new_ state
instance, without modifying the original object.

As such, _never_ mutate properties of a state directly. That'll
just break things.
*/
declare class EditorState {
  /**
  The current document.
  */
  readonly doc: Text;
  /**
  The current selection.
  */
  readonly selection: EditorSelection;
  private constructor();
  /**
  Retrieve the value of a [state field](https://codemirror.net/6/docs/ref/#state.StateField). Throws
  an error when the state doesn't have that field, unless you pass
  `false` as second parameter.
  */
  field<T>(field: StateField<T>): T;
  field<T>(field: StateField<T>, require: false): T | undefined;
  /**
  Create a [transaction](https://codemirror.net/6/docs/ref/#state.Transaction) that updates this
  state. Any number of [transaction specs](https://codemirror.net/6/docs/ref/#state.TransactionSpec)
  can be passed. Unless
  [`sequential`](https://codemirror.net/6/docs/ref/#state.TransactionSpec.sequential) is set, the
  [changes](https://codemirror.net/6/docs/ref/#state.TransactionSpec.changes) (if any) of each spec
  are assumed to start in the _current_ document (not the document
  produced by previous specs), and its
  [selection](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection) and
  [effects](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) are assumed to refer
  to the document created by its _own_ changes. The resulting
  transaction contains the combined effect of all the different
  specs. For [selection](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection), later
  specs take precedence over earlier ones.
  */
  update(...specs: readonly TransactionSpec[]): Transaction;
  /**
  Create a [transaction spec](https://codemirror.net/6/docs/ref/#state.TransactionSpec) that
  replaces every selection range with the given content.
  */
  replaceSelection(text: string | Text): TransactionSpec;
  /**
  Create a set of changes and a new selection by running the given
  function for each range in the active selection. The function
  can return an optional set of changes (in the coordinate space
  of the start document), plus an updated range (in the coordinate
  space of the document produced by the call's own changes). This
  method will merge all the changes and ranges into a single
  changeset and selection, and return it as a [transaction
  spec](https://codemirror.net/6/docs/ref/#state.TransactionSpec), which can be passed to
  [`update`](https://codemirror.net/6/docs/ref/#state.EditorState.update).
  */
  changeByRange(f: (range: SelectionRange) => {
    range: SelectionRange;
    changes?: ChangeSpec;
    effects?: StateEffect<any> | readonly StateEffect<any>[];
  }): {
    changes: ChangeSet;
    selection: EditorSelection;
    effects: readonly StateEffect<any>[];
  };
  /**
  Create a [change set](https://codemirror.net/6/docs/ref/#state.ChangeSet) from the given change
  description, taking the state's document length and line
  separator into account.
  */
  changes(spec?: ChangeSpec): ChangeSet;
  /**
  Using the state's [line
  separator](https://codemirror.net/6/docs/ref/#state.EditorState^lineSeparator), create a
  [`Text`](https://codemirror.net/6/docs/ref/#state.Text) instance from the given string.
  */
  toText(string: string): Text;
  /**
  Return the given range of the document as a string.
  */
  sliceDoc(from?: number, to?: number): string;
  /**
  Get the value of a state [facet](https://codemirror.net/6/docs/ref/#state.Facet).
  */
  facet<Output>(facet: FacetReader<Output>): Output;
  /**
  Convert this state to a JSON-serializable object. When custom
  fields should be serialized, you can pass them in as an object
  mapping property names (in the resulting object, which should
  not use `doc` or `selection`) to fields.
  */
  toJSON(fields?: {
    [prop: string]: StateField<any>;
  }): any;
  /**
  Deserialize a state from its JSON representation. When custom
  fields should be deserialized, pass the same object you passed
  to [`toJSON`](https://codemirror.net/6/docs/ref/#state.EditorState.toJSON) when serializing as
  third argument.
  */
  static fromJSON(json: any, config?: EditorStateConfig, fields?: {
    [prop: string]: StateField<any>;
  }): EditorState;
  /**
  Create a new state. You'll usually only need this when
  initializing an editor—updated states are created by applying
  transactions.
  */
  static create(config?: EditorStateConfig): EditorState;
  /**
  A facet that, when enabled, causes the editor to allow multiple
  ranges to be selected. Be careful though, because by default the
  editor relies on the native DOM selection, which cannot handle
  multiple selections. An extension like
  [`drawSelection`](https://codemirror.net/6/docs/ref/#view.drawSelection) can be used to make
  secondary selections visible to the user.
  */
  static allowMultipleSelections: Facet<boolean, boolean>;
  /**
  Configures the tab size to use in this state. The first
  (highest-precedence) value of the facet is used. If no value is
  given, this defaults to 4.
  */
  static tabSize: Facet<number, number>;
  /**
  The size (in columns) of a tab in the document, determined by
  the [`tabSize`](https://codemirror.net/6/docs/ref/#state.EditorState^tabSize) facet.
  */
  get tabSize(): number;
  /**
  The line separator to use. By default, any of `"\n"`, `"\r\n"`
  and `"\r"` is treated as a separator when splitting lines, and
  lines are joined with `"\n"`.
  
  When you configure a value here, only that precise separator
  will be used, allowing you to round-trip documents through the
  editor without normalizing line separators.
  */
  static lineSeparator: Facet<string, string | undefined>;
  /**
  Get the proper [line-break](https://codemirror.net/6/docs/ref/#state.EditorState^lineSeparator)
  string for this state.
  */
  get lineBreak(): string;
  /**
  This facet controls the value of the
  [`readOnly`](https://codemirror.net/6/docs/ref/#state.EditorState.readOnly) getter, which is
  consulted by commands and extensions that implement editing
  functionality to determine whether they should apply. It
  defaults to false, but when its highest-precedence value is
  `true`, such functionality disables itself.
  
  Not to be confused with
  [`EditorView.editable`](https://codemirror.net/6/docs/ref/#view.EditorView^editable), which
  controls whether the editor's DOM is set to be editable (and
  thus focusable).
  */
  static readOnly: Facet<boolean, boolean>;
  /**
  Returns true when the editor is
  [configured](https://codemirror.net/6/docs/ref/#state.EditorState^readOnly) to be read-only.
  */
  get readOnly(): boolean;
  /**
  Registers translation phrases. The
  [`phrase`](https://codemirror.net/6/docs/ref/#state.EditorState.phrase) method will look through
  all objects registered with this facet to find translations for
  its argument.
  */
  static phrases: Facet<{
    [key: string]: string;
  }, readonly {
    [key: string]: string;
  }[]>;
  /**
  Look up a translation for the given phrase (via the
  [`phrases`](https://codemirror.net/6/docs/ref/#state.EditorState^phrases) facet), or return the
  original string if no translation is found.
  
  If additional arguments are passed, they will be inserted in
  place of markers like `$1` (for the first value) and `$2`, etc.
  A single `$` is equivalent to `$1`, and `$$` will produce a
  literal dollar sign.
  */
  phrase(phrase: string, ...insert: any[]): string;
  /**
  A facet used to register [language
  data](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt) providers.
  */
  static languageData: Facet<(state: EditorState, pos: number, side: -1 | 0 | 1) => readonly {
    [name: string]: any;
  }[], readonly ((state: EditorState, pos: number, side: -1 | 0 | 1) => readonly {
    [name: string]: any;
  }[])[]>;
  /**
  Find the values for a given language data field, provided by the
  the [`languageData`](https://codemirror.net/6/docs/ref/#state.EditorState^languageData) facet.
  
  Examples of language data fields are...
  
  - [`"commentTokens"`](https://codemirror.net/6/docs/ref/#commands.CommentTokens) for specifying
    comment syntax.
  - [`"autocomplete"`](https://codemirror.net/6/docs/ref/#autocomplete.autocompletion^config.override)
    for providing language-specific completion sources.
  - [`"wordChars"`](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer) for adding
    characters that should be considered part of words in this
    language.
  - [`"closeBrackets"`](https://codemirror.net/6/docs/ref/#autocomplete.CloseBracketConfig) controls
    bracket closing behavior.
  */
  languageDataAt<T>(name: string, pos: number, side?: -1 | 0 | 1): readonly T[];
  /**
  Return a function that can categorize strings (expected to
  represent a single [grapheme cluster](https://codemirror.net/6/docs/ref/#state.findClusterBreak))
  into one of:
  
   - Word (contains an alphanumeric character or a character
     explicitly listed in the local language's `"wordChars"`
     language data, which should be a string)
   - Space (contains only whitespace)
   - Other (anything else)
  */
  charCategorizer(at: number): (char: string) => CharCategory;
  /**
  Find the word at the given position, meaning the range
  containing all [word](https://codemirror.net/6/docs/ref/#state.CharCategory.Word) characters
  around it. If no word characters are adjacent to the position,
  this returns null.
  */
  wordAt(pos: number): SelectionRange | null;
  /**
  Facet used to register change filters, which are called for each
  transaction (unless explicitly
  [disabled](https://codemirror.net/6/docs/ref/#state.TransactionSpec.filter)), and can suppress
  part of the transaction's changes.
  
  Such a function can return `true` to indicate that it doesn't
  want to do anything, `false` to completely stop the changes in
  the transaction, or a set of ranges in which changes should be
  suppressed. Such ranges are represented as an array of numbers,
  with each pair of two numbers indicating the start and end of a
  range. So for example `[10, 20, 100, 110]` suppresses changes
  between 10 and 20, and between 100 and 110.
  */
  static changeFilter: Facet<(tr: Transaction) => boolean | readonly number[], readonly ((tr: Transaction) => boolean | readonly number[])[]>;
  /**
  Facet used to register a hook that gets a chance to update or
  replace transaction specs before they are applied. This will
  only be applied for transactions that don't have
  [`filter`](https://codemirror.net/6/docs/ref/#state.TransactionSpec.filter) set to `false`. You
  can either return a single transaction spec (possibly the input
  transaction), or an array of specs (which will be combined in
  the same way as the arguments to
  [`EditorState.update`](https://codemirror.net/6/docs/ref/#state.EditorState.update)).
  
  When possible, it is recommended to avoid accessing
  [`Transaction.state`](https://codemirror.net/6/docs/ref/#state.Transaction.state) in a filter,
  since it will force creation of a state that will then be
  discarded again, if the transaction is actually filtered.
  
  (This functionality should be used with care. Indiscriminately
  modifying transaction is likely to break something or degrade
  the user experience.)
  */
  static transactionFilter: Facet<(tr: Transaction) => TransactionSpec | readonly TransactionSpec[], readonly ((tr: Transaction) => TransactionSpec | readonly TransactionSpec[])[]>;
  /**
  This is a more limited form of
  [`transactionFilter`](https://codemirror.net/6/docs/ref/#state.EditorState^transactionFilter),
  which can only add
  [annotations](https://codemirror.net/6/docs/ref/#state.TransactionSpec.annotations) and
  [effects](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects). _But_, this type
  of filter runs even if the transaction has disabled regular
  [filtering](https://codemirror.net/6/docs/ref/#state.TransactionSpec.filter), making it suitable
  for effects that don't need to touch the changes or selection,
  but do want to process every transaction.
  
  Extenders run _after_ filters, when both are present.
  */
  static transactionExtender: Facet<(tr: Transaction) => Pick<TransactionSpec, "effects" | "annotations"> | null, readonly ((tr: Transaction) => Pick<TransactionSpec, "effects" | "annotations"> | null)[]>;
}
/**
Subtype of [`Command`](https://codemirror.net/6/docs/ref/#view.Command) that doesn't require access
to the actual editor view. Mostly useful to define commands that
can be run and tested outside of a browser environment.
*/
//#endregion
//#region node_modules/@lezer/common/dist/index.d.ts
/**
The [`TreeFragment.applyChanges`](#common.TreeFragment^applyChanges)
method expects changed ranges in this format.
*/
interface ChangedRange {
  /**
  The start of the change in the start document
  */
  fromA: number;
  /**
  The end of the change in the start document
  */
  toA: number;
  /**
  The start of the replacement in the new document
  */
  fromB: number;
  /**
  The end of the replacement in the new document
  */
  toB: number;
}
/**
Tree fragments are used during [incremental
parsing](#common.Parser.startParse) to track parts of old trees
that can be reused in a new parse. An array of fragments is used
to track regions of an old tree whose nodes might be reused in new
parses. Use the static
[`applyChanges`](#common.TreeFragment^applyChanges) method to
update fragments for document changes.
*/
declare class TreeFragment {
  /**
  The start of the unchanged range pointed to by this fragment.
  This refers to an offset in the _updated_ document (as opposed
  to the original tree).
  */
  readonly from: number;
  /**
  The end of the unchanged range.
  */
  readonly to: number;
  /**
  The tree that this fragment is based on.
  */
  readonly tree: Tree;
  /**
  The offset between the fragment's tree and the document that
  this fragment can be used against. Add this when going from
  document to tree positions, subtract it to go from tree to
  document positions.
  */
  readonly offset: number;
  /**
  Construct a tree fragment. You'll usually want to use
  [`addTree`](#common.TreeFragment^addTree) and
  [`applyChanges`](#common.TreeFragment^applyChanges) instead of
  calling this directly.
  */
  constructor(
  /**
  The start of the unchanged range pointed to by this fragment.
  This refers to an offset in the _updated_ document (as opposed
  to the original tree).
  */

  from: number,
  /**
  The end of the unchanged range.
  */

  to: number,
  /**
  The tree that this fragment is based on.
  */

  tree: Tree,
  /**
  The offset between the fragment's tree and the document that
  this fragment can be used against. Add this when going from
  document to tree positions, subtract it to go from tree to
  document positions.
  */

  offset: number, openStart?: boolean, openEnd?: boolean);
  /**
  Whether the start of the fragment represents the start of a
  parse, or the end of a change. (In the second case, it may not
  be safe to reuse some nodes at the start, depending on the
  parsing algorithm.)
  */
  get openStart(): boolean;
  /**
  Whether the end of the fragment represents the end of a
  full-document parse, or the start of a change.
  */
  get openEnd(): boolean;
  /**
  Create a set of fragments from a freshly parsed tree, or update
  an existing set of fragments by replacing the ones that overlap
  with a tree with content from the new tree. When `partial` is
  true, the parse is treated as incomplete, and the resulting
  fragment has [`openEnd`](#common.TreeFragment.openEnd) set to
  true.
  */
  static addTree(tree: Tree, fragments?: readonly TreeFragment[], partial?: boolean): readonly TreeFragment[];
  /**
  Apply a set of edits to an array of fragments, removing or
  splitting fragments as necessary to remove edited ranges, and
  adjusting offsets for fragments that moved.
  */
  static applyChanges(fragments: readonly TreeFragment[], changes: readonly ChangedRange[], minGap?: number): readonly TreeFragment[];
}
/**
Interface used to represent an in-progress parse, which can be
moved forward piece-by-piece.
*/
interface PartialParse {
  /**
  Advance the parse state by some amount. Will return the finished
  syntax tree when the parse completes.
  */
  advance(): Tree | null;
  /**
  The position up to which the document has been parsed. Note
  that, in multi-pass parsers, this will stay back until the last
  pass has moved past a given position.
  */
  readonly parsedPos: number;
  /**
  Tell the parse to not advance beyond the given position.
  `advance` will return a tree when the parse has reached the
  position. Note that, depending on the parser algorithm and the
  state of the parse when `stopAt` was called, that tree may
  contain nodes beyond the position. It is an error to call
  `stopAt` with a higher position than it's [current
  value](#common.PartialParse.stoppedAt).
  */
  stopAt(pos: number): void;
  /**
  Reports whether `stopAt` has been called on this parse.
  */
  readonly stoppedAt: number | null;
}
/**
A superclass that parsers should extend.
*/
declare abstract class Parser {
  /**
  Start a parse for a single tree. This is the method concrete
  parser implementations must implement. Called by `startParse`,
  with the optional arguments resolved.
  */
  abstract createParse(input: Input, fragments: readonly TreeFragment[], ranges: readonly {
    from: number;
    to: number;
  }[]): PartialParse;
  /**
  Start a parse, returning a [partial parse](#common.PartialParse)
  object. [`fragments`](#common.TreeFragment) can be passed in to
  make the parse incremental.
  
  By default, the entire input is parsed. You can pass `ranges`,
  which should be a sorted array of non-empty, non-overlapping
  ranges, to parse only those ranges. The tree returned in that
  case will start at `ranges[0].from`.
  */
  startParse(input: Input | string, fragments?: readonly TreeFragment[], ranges?: readonly {
    from: number;
    to: number;
  }[]): PartialParse;
  /**
  Run a full parse, returning the resulting tree.
  */
  parse(input: Input | string, fragments?: readonly TreeFragment[], ranges?: readonly {
    from: number;
    to: number;
  }[]): Tree;
}
/**
This is the interface parsers use to access the document. To run
Lezer directly on your own document data structure, you have to
write an implementation of it.
*/
interface Input {
  /**
  The length of the document.
  */
  readonly length: number;
  /**
  Get the chunk after the given position. The returned string
  should start at `from` and, if that isn't the end of the
  document, may be of any length greater than zero.
  */
  chunk(from: number): string;
  /**
  Indicates whether the chunks already end at line breaks, so that
  client code that wants to work by-line can avoid re-scanning
  them for line breaks. When this is true, the result of `chunk()`
  should either be a single line break, or the content between
  `from` and the next line break.
  */
  readonly lineChunks: boolean;
  /**
  Read the part of the document between the given positions.
  */
  read(from: number, to: number): string;
}
/**
Parse wrapper functions are supported by some parsers to inject
additional parsing logic.
*/
/**
Each [node type](#common.NodeType) or [individual tree](#common.Tree)
can have metadata associated with it in props. Instances of this
class represent prop names.
*/
declare class NodeProp<T> {
  /**
  Indicates whether this prop is stored per [node
  type](#common.NodeType) or per [tree node](#common.Tree).
  */
  perNode: boolean;
  /**
  A method that deserializes a value of this prop from a string.
  Can be used to allow a prop to be directly written in a grammar
  file.
  */
  deserialize: (str: string) => T;
  /**
  Create a new node prop type.
  */
  constructor(config?: {
    /**
    The [deserialize](#common.NodeProp.deserialize) function to
    use for this prop, used for example when directly providing
    the prop from a grammar file. Defaults to a function that
    raises an error.
    */
    deserialize?: (str: string) => T;
    /**
    If configuring another value for this prop when it already
    exists on a node should combine the old and new values, rather
    than overwrite the old value, you can pass a function that
    does the combining here.
    */
    combine?: (a: T, b: T) => T;
    /**
    By default, node props are stored in the [node
    type](#common.NodeType). It can sometimes be useful to directly
    store information (usually related to the parsing algorithm)
    in [nodes](#common.Tree) themselves. Set this to true to enable
    that for this prop.
    */
    perNode?: boolean;
  });
  /**
  This is meant to be used with
  [`NodeSet.extend`](#common.NodeSet.extend) or
  [`LRParser.configure`](#lr.ParserConfig.props) to compute
  prop values for each node type in the set. Takes a [match
  object](#common.NodeType^match) or function that returns undefined
  if the node type doesn't get this prop, and the prop's value if
  it does.
  */
  add(match: {
    [selector: string]: T;
  } | ((type: NodeType) => T | undefined)): NodePropSource;
  /**
  Prop that is used to describe matching delimiters. For opening
  delimiters, this holds an array of node names (written as a
  space-separated string when declaring this prop in a grammar)
  for the node types of closing delimiters that match it.
  */
  static closedBy: NodeProp<readonly string[]>;
  /**
  The inverse of [`closedBy`](#common.NodeProp^closedBy). This is
  attached to closing delimiters, holding an array of node names
  of types of matching opening delimiters.
  */
  static openedBy: NodeProp<readonly string[]>;
  /**
  Used to assign node types to groups (for example, all node
  types that represent an expression could be tagged with an
  `"Expression"` group).
  */
  static group: NodeProp<readonly string[]>;
  /**
  Attached to nodes to indicate these should be
  [displayed](https://codemirror.net/docs/ref/#language.syntaxTree)
  in a bidirectional text isolate, so that direction-neutral
  characters on their sides don't incorrectly get associated with
  surrounding text. You'll generally want to set this for nodes
  that contain arbitrary text, like strings and comments, and for
  nodes that appear _inside_ arbitrary text, like HTML tags. When
  not given a value, in a grammar declaration, defaults to
  `"auto"`.
  */
  static isolate: NodeProp<"rtl" | "ltr" | "auto">;
  /**
  The hash of the [context](#lr.ContextTracker.constructor)
  that the node was parsed in, if any. Used to limit reuse of
  contextual nodes.
  */
  static contextHash: NodeProp<number>;
  /**
  The distance beyond the end of the node that the tokenizer
  looked ahead for any of the tokens inside the node. (The LR
  parser only stores this when it is larger than 25, for
  efficiency reasons.)
  */
  static lookAhead: NodeProp<number>;
  /**
  This per-node prop is used to replace a given node, or part of a
  node, with another tree. This is useful to include trees from
  different languages in mixed-language parsers.
  */
  static mounted: NodeProp<MountedTree>;
}
/**
A mounted tree, which can be [stored](#common.NodeProp^mounted) on
a tree node to indicate that parts of its content are
represented by another tree.
*/
declare class MountedTree {
  /**
  The inner tree.
  */
  readonly tree: Tree;
  /**
  If this is null, this tree replaces the entire node (it will
  be included in the regular iteration instead of its host
  node). If not, only the given ranges are considered to be
  covered by this tree. This is used for trees that are mixed in
  a way that isn't strictly hierarchical. Such mounted trees are
  only entered by [`resolveInner`](#common.Tree.resolveInner)
  and [`enter`](#common.SyntaxNode.enter).
  */
  readonly overlay: readonly {
    from: number;
    to: number;
  }[] | null;
  /**
  The parser used to create this subtree.
  */
  readonly parser: Parser;
  /**
  [Indicates](#common.IterMode.EnterBracketed) that the nested
  content is delineated with some kind
  of bracket token.
  */
  readonly bracketed: boolean;
  constructor(
  /**
  The inner tree.
  */

  tree: Tree,
  /**
  If this is null, this tree replaces the entire node (it will
  be included in the regular iteration instead of its host
  node). If not, only the given ranges are considered to be
  covered by this tree. This is used for trees that are mixed in
  a way that isn't strictly hierarchical. Such mounted trees are
  only entered by [`resolveInner`](#common.Tree.resolveInner)
  and [`enter`](#common.SyntaxNode.enter).
  */

  overlay: readonly {
    from: number;
    to: number;
  }[] | null,
  /**
  The parser used to create this subtree.
  */

  parser: Parser,
  /**
  [Indicates](#common.IterMode.EnterBracketed) that the nested
  content is delineated with some kind
  of bracket token.
  */

  bracketed?: boolean);
}
/**
Type returned by [`NodeProp.add`](#common.NodeProp.add). Describes
whether a prop should be added to a given node type in a node set,
and what value it should have.
*/
type NodePropSource = (type: NodeType) => null | [NodeProp<any>, any];
/**
Each node in a syntax tree has a node type associated with it.
*/
declare class NodeType {
  /**
  The name of the node type. Not necessarily unique, but if the
  grammar was written properly, different node types with the
  same name within a node set should play the same semantic
  role.
  */
  readonly name: string;
  /**
  The id of this node in its set. Corresponds to the term ids
  used in the parser.
  */
  readonly id: number;
  /**
  Define a node type.
  */
  static define(spec: {
    /**
    The ID of the node type. When this type is used in a
    [set](#common.NodeSet), the ID must correspond to its index in
    the type array.
    */
    id: number;
    /**
    The name of the node type. Leave empty to define an anonymous
    node.
    */
    name?: string;
    /**
    [Node props](#common.NodeProp) to assign to the type. The value
    given for any given prop should correspond to the prop's type.
    */
    props?: readonly ([NodeProp<any>, any] | NodePropSource)[];
    /**
    Whether this is a [top node](#common.NodeType.isTop).
    */
    top?: boolean;
    /**
    Whether this node counts as an [error
    node](#common.NodeType.isError).
    */
    error?: boolean;
    /**
    Whether this node is a [skipped](#common.NodeType.isSkipped)
    node.
    */
    skipped?: boolean;
  }): NodeType;
  /**
  Retrieves a node prop for this type. Will return `undefined` if
  the prop isn't present on this node.
  */
  prop<T>(prop: NodeProp<T>): T | undefined;
  /**
  True when this is the top node of a grammar.
  */
  get isTop(): boolean;
  /**
  True when this node is produced by a skip rule.
  */
  get isSkipped(): boolean;
  /**
  Indicates whether this is an error node.
  */
  get isError(): boolean;
  /**
  When true, this node type doesn't correspond to a user-declared
  named node, for example because it is used to cache repetition.
  */
  get isAnonymous(): boolean;
  /**
  Returns true when this node's name or one of its
  [groups](#common.NodeProp^group) matches the given string.
  */
  is(name: string | number): boolean;
  /**
  An empty dummy node type to use when no actual type is available.
  */
  static none: NodeType;
  /**
  Create a function from node types to arbitrary values by
  specifying an object whose property names are node or
  [group](#common.NodeProp^group) names. Often useful with
  [`NodeProp.add`](#common.NodeProp.add). You can put multiple
  names, separated by spaces, in a single property name to map
  multiple node names to a single value.
  */
  static match<T>(map: {
    [selector: string]: T;
  }): (node: NodeType) => T | undefined;
}
/**
A node set holds a collection of node types. It is used to
compactly represent trees by storing their type ids, rather than a
full pointer to the type object, in a numeric array. Each parser
[has](#lr.LRParser.nodeSet) a node set, and [tree
buffers](#common.TreeBuffer) can only store collections of nodes
from the same set. A set can have a maximum of 2**16 (65536) node
types in it, so that the ids fit into 16-bit typed array slots.
*/
declare class NodeSet {
  /**
  The node types in this set, by id.
  */
  readonly types: readonly NodeType[];
  /**
  Create a set with the given types. The `id` property of each
  type should correspond to its position within the array.
  */
  constructor(
  /**
  The node types in this set, by id.
  */

  types: readonly NodeType[]);
  /**
  Create a copy of this set with some node properties added. The
  arguments to this method can be created with
  [`NodeProp.add`](#common.NodeProp.add).
  */
  extend(...props: NodePropSource[]): NodeSet;
}
/**
Options that control iteration. Can be combined with the `|`
operator to enable multiple ones.
*/
declare enum IterMode {
  /**
  When enabled, iteration will only visit [`Tree`](#common.Tree)
  objects, not nodes packed into
  [`TreeBuffer`](#common.TreeBuffer)s.
  */
  ExcludeBuffers = 1,
  /**
  Enable this to make iteration include anonymous nodes (such as
  the nodes that wrap repeated grammar constructs into a balanced
  tree).
  */
  IncludeAnonymous = 2,
  /**
  By default, regular [mounted](#common.NodeProp^mounted) nodes
  replace their base node in iteration. Enable this to ignore them
  instead.
  */
  IgnoreMounts = 4,
  /**
  This option only applies in
  [`enter`](#common.SyntaxNode.enter)-style methods. It tells the
  library to not enter mounted overlays if one covers the given
  position.
  */
  IgnoreOverlays = 8,
  /**
  When set, positions on the boundary of a mounted overlay tree
  that has its [`bracketed`](#common.NestedParse.bracketed) flag
  set will enter that tree regardless of side. Only supported in
  [`enter`](#common.SyntaxNode.enter), not in cursors.
  */
  EnterBracketed = 16
}
/**
A piece of syntax tree. There are two ways to approach these
trees: the way they are actually stored in memory, and the
convenient way.

Syntax trees are stored as a tree of `Tree` and `TreeBuffer`
objects. By packing detail information into `TreeBuffer` leaf
nodes, the representation is made a lot more memory-efficient.

However, when you want to actually work with tree nodes, this
representation is very awkward, so most client code will want to
use the [`TreeCursor`](#common.TreeCursor) or
[`SyntaxNode`](#common.SyntaxNode) interface instead, which provides
a view on some part of this data structure, and can be used to
move around to adjacent nodes.
*/
declare class Tree {
  /**
  The type of the top node.
  */
  readonly type: NodeType;
  /**
  This node's child nodes.
  */
  readonly children: readonly (Tree | TreeBuffer)[];
  /**
  The positions (offsets relative to the start of this tree) of
  the children.
  */
  readonly positions: readonly number[];
  /**
  The total length of this tree
  */
  readonly length: number;
  /**
  Construct a new tree. See also [`Tree.build`](#common.Tree^build).
  */
  constructor(
  /**
  The type of the top node.
  */

  type: NodeType,
  /**
  This node's child nodes.
  */

  children: readonly (Tree | TreeBuffer)[],
  /**
  The positions (offsets relative to the start of this tree) of
  the children.
  */

  positions: readonly number[],
  /**
  The total length of this tree
  */

  length: number,
  /**
  Per-node [node props](#common.NodeProp) to associate with this node.
  */

  props?: readonly [NodeProp<any> | number, any][]);
  /**
  The empty tree
  */
  static empty: Tree;
  /**
  Get a [tree cursor](#common.TreeCursor) positioned at the top of
  the tree. Mode can be used to [control](#common.IterMode) which
  nodes the cursor visits.
  */
  cursor(mode?: IterMode): TreeCursor;
  /**
  Get a [tree cursor](#common.TreeCursor) pointing into this tree
  at the given position and side (see
  [`moveTo`](#common.TreeCursor.moveTo).
  */
  cursorAt(pos: number, side?: -1 | 0 | 1, mode?: IterMode): TreeCursor;
  /**
  Get a [syntax node](#common.SyntaxNode) object for the top of the
  tree.
  */
  get topNode(): SyntaxNode;
  /**
  Get the [syntax node](#common.SyntaxNode) at the given position.
  If `side` is -1, this will move into nodes that end at the
  position. If 1, it'll move into nodes that start at the
  position. With 0, it'll only enter nodes that cover the position
  from both sides.
  
  Note that this will not enter
  [overlays](#common.MountedTree.overlay), and you often want
  [`resolveInner`](#common.Tree.resolveInner) instead.
  */
  resolve(pos: number, side?: -1 | 0 | 1): SyntaxNode;
  /**
  Like [`resolve`](#common.Tree.resolve), but will enter
  [overlaid](#common.MountedTree.overlay) nodes, producing a syntax node
  pointing into the innermost overlaid tree at the given position
  (with parent links going through all parent structure, including
  the host trees).
  */
  resolveInner(pos: number, side?: -1 | 0 | 1): SyntaxNode;
  /**
  In some situations, it can be useful to iterate through all
  nodes around a position, including those in overlays that don't
  directly cover the position. This method gives you an iterator
  that will produce all nodes, from small to big, around the given
  position.
  */
  resolveStack(pos: number, side?: -1 | 0 | 1): NodeIterator;
  /**
  Iterate over the tree and its children, calling `enter` for any
  node that touches the `from`/`to` region (if given) before
  running over such a node's children, and `leave` (if given) when
  leaving the node. When `enter` returns `false`, that node will
  not have its children iterated over (or `leave` called).
  */
  iterate(spec: {
    enter(node: SyntaxNodeRef): boolean | void;
    leave?(node: SyntaxNodeRef): void;
    from?: number;
    to?: number;
    mode?: IterMode;
  }): void;
  /**
  Get the value of the given [node prop](#common.NodeProp) for this
  node. Works with both per-node and per-type props.
  */
  prop<T>(prop: NodeProp<T>): T | undefined;
  /**
  Returns the node's [per-node props](#common.NodeProp.perNode) in a
  format that can be passed to the [`Tree`](#common.Tree)
  constructor.
  */
  get propValues(): readonly [NodeProp<any> | number, any][];
  /**
  Balance the direct children of this tree, producing a copy of
  which may have children grouped into subtrees with type
  [`NodeType.none`](#common.NodeType^none).
  */
  balance(config?: {
    /**
    Function to create the newly balanced subtrees.
    */
    makeTree?: (children: readonly (Tree | TreeBuffer)[], positions: readonly number[], length: number) => Tree;
  }): Tree;
  /**
  Build a tree from a postfix-ordered buffer of node information,
  or a cursor over such a buffer.
  */
  static build(data: BuildData): Tree;
}
/**
Represents a sequence of nodes.
*/
type NodeIterator = {
  node: SyntaxNode;
  next: NodeIterator | null;
};
type BuildData = {
  /**
  The buffer or buffer cursor to read the node data from.
  
  When this is an array, it should contain four values for every
  node in the tree.
  
   - The first holds the node's type, as a node ID pointing into
     the given `NodeSet`.
   - The second holds the node's start offset.
   - The third the end offset.
   - The fourth the amount of space taken up in the array by this
     node and its children. Since there's four values per node,
     this is the total number of nodes inside this node (children
     and transitive children) plus one for the node itself, times
     four.
  
  Parent nodes should appear _after_ child nodes in the array. As
  an example, a node of type 10 spanning positions 0 to 4, with
  two children, of type 11 and 12, might look like this:
  
      [11, 0, 1, 4, 12, 2, 4, 4, 10, 0, 4, 12]
  */
  buffer: BufferCursor | readonly number[];
  /**
  The node types to use.
  */
  nodeSet: NodeSet;
  /**
  The id of the top node type.
  */
  topID: number;
  /**
  The position the tree should start at. Defaults to 0.
  */
  start?: number;
  /**
  The position in the buffer where the function should stop
  reading. Defaults to 0.
  */
  bufferStart?: number;
  /**
  The length of the wrapping node. The end offset of the last
  child is used when not provided.
  */
  length?: number;
  /**
  The maximum buffer length to use. Defaults to
  [`DefaultBufferLength`](#common.DefaultBufferLength).
  */
  maxBufferLength?: number;
  /**
  An optional array holding reused nodes that the buffer can refer
  to.
  */
  reused?: readonly Tree[];
  /**
  The first node type that indicates repeat constructs in this
  grammar.
  */
  minRepeatType?: number;
};
/**
This is used by `Tree.build` as an abstraction for iterating over
a tree buffer. A cursor initially points at the very last element
in the buffer. Every time `next()` is called it moves on to the
previous one.
*/
interface BufferCursor {
  /**
  The current buffer position (four times the number of nodes
  remaining).
  */
  pos: number;
  /**
  The node ID of the next node in the buffer.
  */
  id: number;
  /**
  The start position of the next node in the buffer.
  */
  start: number;
  /**
  The end position of the next node.
  */
  end: number;
  /**
  The size of the next node (the number of nodes inside, counting
  the node itself, times 4).
  */
  size: number;
  /**
  Moves `this.pos` down by 4.
  */
  next(): void;
  /**
  Create a copy of this cursor.
  */
  fork(): BufferCursor;
}
/**
Tree buffers contain (type, start, end, endIndex) quads for each
node. In such a buffer, nodes are stored in prefix order (parents
before children, with the endIndex of the parent indicating which
children belong to it).
*/
declare class TreeBuffer {
  /**
  The buffer's content.
  */
  readonly buffer: Uint16Array;
  /**
  The total length of the group of nodes in the buffer.
  */
  readonly length: number;
  /**
  The node set used in this buffer.
  */
  readonly set: NodeSet;
  /**
  Create a tree buffer.
  */
  constructor(
  /**
  The buffer's content.
  */

  buffer: Uint16Array,
  /**
  The total length of the group of nodes in the buffer.
  */

  length: number,
  /**
  The node set used in this buffer.
  */

  set: NodeSet);
}
/**
The set of properties provided by both [`SyntaxNode`](#common.SyntaxNode)
and [`TreeCursor`](#common.TreeCursor). Note that, if you need
an object that is guaranteed to stay stable in the future, you
need to use the [`node`](#common.SyntaxNodeRef.node) accessor.
*/
interface SyntaxNodeRef {
  /**
  The start position of the node.
  */
  readonly from: number;
  /**
  The end position of the node.
  */
  readonly to: number;
  /**
  The type of the node.
  */
  readonly type: NodeType;
  /**
  The name of the node (`.type.name`).
  */
  readonly name: string;
  /**
  Get the [tree](#common.Tree) that represents the current node,
  if any. Will return null when the node is in a [tree
  buffer](#common.TreeBuffer).
  */
  readonly tree: Tree | null;
  /**
  Retrieve a stable [syntax node](#common.SyntaxNode) at this
  position.
  */
  readonly node: SyntaxNode;
  /**
  Test whether the node matches a given context—a sequence of
  direct parent nodes. Empty strings in the context array act as
  wildcards, other strings must match the ancestor node's name.
  */
  matchContext(context: readonly string[]): boolean;
}
/**
A syntax node provides an immutable pointer to a given node in a
tree. When iterating over large amounts of nodes, you may want to
use a mutable [cursor](#common.TreeCursor) instead, which is more
efficient.
*/
interface SyntaxNode extends SyntaxNodeRef {
  /**
  The node's parent node, if any.
  */
  parent: SyntaxNode | null;
  /**
  The first child, if the node has children.
  */
  firstChild: SyntaxNode | null;
  /**
  The node's last child, if available.
  */
  lastChild: SyntaxNode | null;
  /**
  The first child that ends after `pos`.
  */
  childAfter(pos: number): SyntaxNode | null;
  /**
  The last child that starts before `pos`.
  */
  childBefore(pos: number): SyntaxNode | null;
  /**
  Enter the child at the given position. If side is -1 the child
  may end at that position, when 1 it may start there.
  
  This will by default enter
  [overlaid](#common.MountedTree.overlay)
  [mounted](#common.NodeProp^mounted) trees. You can set
  `overlays` to false to disable that.
  
  Similarly, when `buffers` is false this will not enter
  [buffers](#common.TreeBuffer), only [nodes](#common.Tree) (which
  is mostly useful when looking for props, which cannot exist on
  buffer-allocated nodes).
  */
  enter(pos: number, side: -1 | 0 | 1, mode?: IterMode): SyntaxNode | null;
  /**
  This node's next sibling, if any.
  */
  nextSibling: SyntaxNode | null;
  /**
  This node's previous sibling.
  */
  prevSibling: SyntaxNode | null;
  /**
  Read the given node prop from this node.
  */
  prop<T>(prop: NodeProp<T>): T | undefined;
  /**
  A [tree cursor](#common.TreeCursor) starting at this node.
  */
  cursor(mode?: IterMode): TreeCursor;
  /**
  Find the node around, before (if `side` is -1), or after (`side`
  is 1) the given position. Will look in parent nodes if the
  position is outside this node.
  */
  resolve(pos: number, side?: -1 | 0 | 1): SyntaxNode;
  /**
  Similar to `resolve`, but enter
  [overlaid](#common.MountedTree.overlay) nodes.
  */
  resolveInner(pos: number, side?: -1 | 0 | 1): SyntaxNode;
  /**
  Move the position to the innermost node before `pos` that looks
  like it is unfinished (meaning it ends in an error node or has a
  child ending in an error node right at its end).
  */
  enterUnfinishedNodesBefore(pos: number): SyntaxNode;
  /**
  Get a [tree](#common.Tree) for this node. Will allocate one if it
  points into a buffer.
  */
  toTree(): Tree;
  /**
  Get the first child of the given type (which may be a [node
  name](#common.NodeType.name) or a [group
  name](#common.NodeProp^group)). If `before` is non-null, only
  return children that occur somewhere after a node with that name
  or group. If `after` is non-null, only return children that
  occur somewhere before a node with that name or group.
  */
  getChild(type: string | number, before?: string | number | null, after?: string | number | null): SyntaxNode | null;
  /**
  Like [`getChild`](#common.SyntaxNode.getChild), but return all
  matching children, not just the first.
  */
  getChildren(type: string | number, before?: string | number | null, after?: string | number | null): SyntaxNode[];
}
/**
A tree cursor object focuses on a given node in a syntax tree, and
allows you to move to adjacent nodes.
*/
declare class TreeCursor implements SyntaxNodeRef {
  /**
  The node's type.
  */
  type: NodeType;
  /**
  Shorthand for `.type.name`.
  */
  get name(): string;
  /**
  The start source offset of this node.
  */
  from: number;
  /**
  The end source offset.
  */
  to: number;
  private stack;
  private bufferNode;
  private yieldNode;
  private yieldBuf;
  /**
  Move the cursor to this node's first child. When this returns
  false, the node has no child, and the cursor has not been moved.
  */
  firstChild(): boolean;
  /**
  Move the cursor to this node's last child.
  */
  lastChild(): boolean;
  /**
  Move the cursor to the first child that ends after `pos`.
  */
  childAfter(pos: number): boolean;
  /**
  Move to the last child that starts before `pos`.
  */
  childBefore(pos: number): boolean;
  /**
  Move the cursor to the child around `pos`. If side is -1 the
  child may end at that position, when 1 it may start there. This
  will also enter [overlaid](#common.MountedTree.overlay)
  [mounted](#common.NodeProp^mounted) trees unless `overlays` is
  set to false.
  */
  enter(pos: number, side: -1 | 0 | 1, mode?: IterMode): boolean;
  /**
  Move to the node's parent node, if this isn't the top node.
  */
  parent(): boolean;
  /**
  Move to this node's next sibling, if any.
  */
  nextSibling(): boolean;
  /**
  Move to this node's previous sibling, if any.
  */
  prevSibling(): boolean;
  private atLastNode;
  private move;
  /**
  Move to the next node in a
  [pre-order](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order,_NLR)
  traversal, going from a node to its first child or, if the
  current node is empty or `enter` is false, its next sibling or
  the next sibling of the first parent node that has one.
  */
  next(enter?: boolean): boolean;
  /**
  Move to the next node in a last-to-first pre-order traversal. A
  node is followed by its last child or, if it has none, its
  previous sibling or the previous sibling of the first parent
  node that has one.
  */
  prev(enter?: boolean): boolean;
  /**
  Move the cursor to the innermost node that covers `pos`. If
  `side` is -1, it will enter nodes that end at `pos`. If it is 1,
  it will enter nodes that start at `pos`.
  */
  moveTo(pos: number, side?: -1 | 0 | 1): this;
  /**
  Get a [syntax node](#common.SyntaxNode) at the cursor's current
  position.
  */
  get node(): SyntaxNode;
  /**
  Get the [tree](#common.Tree) that represents the current node, if
  any. Will return null when the node is in a [tree
  buffer](#common.TreeBuffer).
  */
  get tree(): Tree | null;
  /**
  Iterate over the current node and all its descendants, calling
  `enter` when entering a node and `leave`, if given, when leaving
  one. When `enter` returns `false`, any children of that node are
  skipped, and `leave` isn't called for it.
  */
  iterate(enter: (node: SyntaxNodeRef) => boolean | void, leave?: (node: SyntaxNodeRef) => void): void;
  /**
  Test whether the current node matches a given context—a sequence
  of direct parent node names. Empty strings in the context array
  are treated as wildcards.
  */
  matchContext(context: readonly string[]): boolean;
}
/**
Provides a way to associate values with pieces of trees. As long
as that part of the tree is reused, the associated values can be
retrieved from an updated tree.
*/
//#endregion
//#region node_modules/style-mod/src/style-mod.d.ts
declare class StyleModule {
  constructor(spec: {
    [selector: string]: StyleSpec;
  }, options?: {
    finish?(sel: string): string;
  });
  getRules(): string;
  static mount(root: Document | ShadowRoot | DocumentOrShadowRoot, module: StyleModule | ReadonlyArray<StyleModule>, options?: {
    nonce?: string;
  }): void;
  static newName(): string;
}
type StyleSpec = {
  [propOrSelector: string]: string | number | StyleSpec | null;
};
//#endregion
//#region node_modules/@lezer/highlight/dist/index.d.ts
/**
Highlighting tags are markers that denote a highlighting category.
They are [associated](#highlight.styleTags) with parts of a syntax
tree by a language mode, and then mapped to an actual CSS style by
a [highlighter](#highlight.Highlighter).

Because syntax tree node types and highlight styles have to be
able to talk the same language, CodeMirror uses a mostly _closed_
[vocabulary](#highlight.tags) of syntax tags (as opposed to
traditional open string-based systems, which make it hard for
highlighting themes to cover all the tokens produced by the
various languages).

It _is_ possible to [define](#highlight.Tag^define) your own
highlighting tags for system-internal use (where you control both
the language package and the highlighter), but such tags will not
be picked up by regular highlighters (though you can derive them
from standard tags to allow highlighters to fall back to those).
*/
declare class Tag {
  /**
  The set of this tag and all its parent tags, starting with
  this one itself and sorted in order of decreasing specificity.
  */
  readonly set: Tag[];
  toString(): string;
  /**
  Define a new tag. If `parent` is given, the tag is treated as a
  sub-tag of that parent, and
  [highlighters](#highlight.tagHighlighter) that don't mention
  this tag will try to fall back to the parent tag (or grandparent
  tag, etc).
  */
  static define(name?: string, parent?: Tag): Tag;
  static define(parent?: Tag): Tag;
  /**
  Define a tag _modifier_, which is a function that, given a tag,
  will return a tag that is a subtag of the original. Applying the
  same modifier to a twice tag will return the same value (`m1(t1)
  == m1(t1)`) and applying multiple modifiers will, regardless or
  order, produce the same tag (`m1(m2(t1)) == m2(m1(t1))`).
  
  When multiple modifiers are applied to a given base tag, each
  smaller set of modifiers is registered as a parent, so that for
  example `m1(m2(m3(t1)))` is a subtype of `m1(m2(t1))`,
  `m1(m3(t1)`, and so on.
  */
  static defineModifier(name?: string): (tag: Tag) => Tag;
}
/**
This function is used to add a set of tags to a language syntax
via [`NodeSet.extend`](#common.NodeSet.extend) or
[`LRParser.configure`](#lr.LRParser.configure).

The argument object maps node selectors to [highlighting
tags](#highlight.Tag) or arrays of tags.

Node selectors may hold one or more (space-separated) node paths.
Such a path can be a [node name](#common.NodeType.name), or
multiple node names (or `*` wildcards) separated by slash
characters, as in `"Block/Declaration/VariableName"`. Such a path
matches the final node but only if its direct parent nodes are the
other nodes mentioned. A `*` in such a path matches any parent,
but only a single level—wildcards that match multiple parents
aren't supported, both for efficiency reasons and because Lezer
trees make it rather hard to reason about what they would match.)

A path can be ended with `/...` to indicate that the tag assigned
to the node should also apply to all child nodes, even if they
match their own style (by default, only the innermost style is
used).

When a path ends in `!`, as in `Attribute!`, no further matching
happens for the node's child nodes, and the entire node gets the
given style.

In this notation, node names that contain `/`, `!`, `*`, or `...`
must be quoted as JSON strings.

For example:

```javascript
parser.configure({props: [
  styleTags({
    // Style Number and BigNumber nodes
    "Number BigNumber": tags.number,
    // Style Escape nodes whose parent is String
    "String/Escape": tags.escape,
    // Style anything inside Attributes nodes
    "Attributes!": tags.meta,
    // Add a style to all content inside Italic nodes
    "Italic/...": tags.emphasis,
    // Style InvalidString nodes as both `string` and `invalid`
    "InvalidString": [tags.string, tags.invalid],
    // Style the node named "/" as punctuation
    '"/"': tags.punctuation
  })
]})
```
*/
/**
A highlighter defines a mapping from highlighting tags and
language scopes to CSS class names. They are usually defined via
[`tagHighlighter`](#highlight.tagHighlighter) or some wrapper
around that, but it is also possible to implement them from
scratch.
*/
interface Highlighter {
  /**
  Get the set of classes that should be applied to the given set
  of highlighting tags, or null if this highlighter doesn't assign
  a style to the tags.
  */
  style(tags: readonly Tag[]): string | null;
  /**
  When given, the highlighter will only be applied to trees on
  whose [top](#common.NodeType.isTop) node this predicate returns
  true.
  */
  scope?(node: NodeType): boolean;
}
/**
Define a [highlighter](#highlight.Highlighter) from an array of
tag/class pairs. Classes associated with more specific tags will
take precedence.
*/
/**
The default set of highlighting [tags](#highlight.Tag).

This collection is heavily biased towards programming languages,
and necessarily incomplete. A full ontology of syntactic
constructs would fill a stack of books, and be impractical to
write themes for. So try to make do with this set. If all else
fails, [open an
issue](https://code.haverbeke.berlin/codemirror/dev/issues) to propose a
new tag, or [define](#highlight.Tag^define) a local custom tag for
your use case.

Note that it is not obligatory to always attach the most specific
tag possible to an element—if your grammar can't easily
distinguish a certain type of element (such as a local variable),
it is okay to style it as its more general variant (a variable).

For tags that extend some parent tag, the documentation links to
the parent.
*/
declare const tags: {
  /**
  A comment.
  */
  comment: Tag;
  /**
  A line [comment](#highlight.tags.comment).
  */
  lineComment: Tag;
  /**
  A block [comment](#highlight.tags.comment).
  */
  blockComment: Tag;
  /**
  A documentation [comment](#highlight.tags.comment).
  */
  docComment: Tag;
  /**
  Any kind of identifier.
  */
  name: Tag;
  /**
  The [name](#highlight.tags.name) of a variable.
  */
  variableName: Tag;
  /**
  A type [name](#highlight.tags.name).
  */
  typeName: Tag;
  /**
  A tag name (subtag of [`typeName`](#highlight.tags.typeName)).
  */
  tagName: Tag;
  /**
  A property or field [name](#highlight.tags.name).
  */
  propertyName: Tag;
  /**
  An attribute name (subtag of [`propertyName`](#highlight.tags.propertyName)).
  */
  attributeName: Tag;
  /**
  The [name](#highlight.tags.name) of a class.
  */
  className: Tag;
  /**
  A label [name](#highlight.tags.name).
  */
  labelName: Tag;
  /**
  A namespace [name](#highlight.tags.name).
  */
  namespace: Tag;
  /**
  The [name](#highlight.tags.name) of a macro.
  */
  macroName: Tag;
  /**
  A literal value.
  */
  literal: Tag;
  /**
  A string [literal](#highlight.tags.literal).
  */
  string: Tag;
  /**
  A documentation [string](#highlight.tags.string).
  */
  docString: Tag;
  /**
  A character literal (subtag of [string](#highlight.tags.string)).
  */
  character: Tag;
  /**
  An attribute value (subtag of [string](#highlight.tags.string)).
  */
  attributeValue: Tag;
  /**
  A number [literal](#highlight.tags.literal).
  */
  number: Tag;
  /**
  An integer [number](#highlight.tags.number) literal.
  */
  integer: Tag;
  /**
  A floating-point [number](#highlight.tags.number) literal.
  */
  float: Tag;
  /**
  A boolean [literal](#highlight.tags.literal).
  */
  bool: Tag;
  /**
  Regular expression [literal](#highlight.tags.literal).
  */
  regexp: Tag;
  /**
  An escape [literal](#highlight.tags.literal), for example a
  backslash escape in a string.
  */
  escape: Tag;
  /**
  A color [literal](#highlight.tags.literal).
  */
  color: Tag;
  /**
  A URL [literal](#highlight.tags.literal).
  */
  url: Tag;
  /**
  A language keyword.
  */
  keyword: Tag;
  /**
  The [keyword](#highlight.tags.keyword) for the self or this
  object.
  */
  self: Tag;
  /**
  The [keyword](#highlight.tags.keyword) for null.
  */
  null: Tag;
  /**
  A [keyword](#highlight.tags.keyword) denoting some atomic value.
  */
  atom: Tag;
  /**
  A [keyword](#highlight.tags.keyword) that represents a unit.
  */
  unit: Tag;
  /**
  A modifier [keyword](#highlight.tags.keyword).
  */
  modifier: Tag;
  /**
  A [keyword](#highlight.tags.keyword) that acts as an operator.
  */
  operatorKeyword: Tag;
  /**
  A control-flow related [keyword](#highlight.tags.keyword).
  */
  controlKeyword: Tag;
  /**
  A [keyword](#highlight.tags.keyword) that defines something.
  */
  definitionKeyword: Tag;
  /**
  A [keyword](#highlight.tags.keyword) related to defining or
  interfacing with modules.
  */
  moduleKeyword: Tag;
  /**
  An operator.
  */
  operator: Tag;
  /**
  An [operator](#highlight.tags.operator) that dereferences something.
  */
  derefOperator: Tag;
  /**
  Arithmetic-related [operator](#highlight.tags.operator).
  */
  arithmeticOperator: Tag;
  /**
  Logical [operator](#highlight.tags.operator).
  */
  logicOperator: Tag;
  /**
  Bit [operator](#highlight.tags.operator).
  */
  bitwiseOperator: Tag;
  /**
  Comparison [operator](#highlight.tags.operator).
  */
  compareOperator: Tag;
  /**
  [Operator](#highlight.tags.operator) that updates its operand.
  */
  updateOperator: Tag;
  /**
  [Operator](#highlight.tags.operator) that defines something.
  */
  definitionOperator: Tag;
  /**
  Type-related [operator](#highlight.tags.operator).
  */
  typeOperator: Tag;
  /**
  Control-flow [operator](#highlight.tags.operator).
  */
  controlOperator: Tag;
  /**
  Program or markup punctuation.
  */
  punctuation: Tag;
  /**
  [Punctuation](#highlight.tags.punctuation) that separates
  things.
  */
  separator: Tag;
  /**
  Bracket-style [punctuation](#highlight.tags.punctuation).
  */
  bracket: Tag;
  /**
  Angle [brackets](#highlight.tags.bracket) (usually `<` and `>`
  tokens).
  */
  angleBracket: Tag;
  /**
  Square [brackets](#highlight.tags.bracket) (usually `[` and `]`
  tokens).
  */
  squareBracket: Tag;
  /**
  Parentheses (usually `(` and `)` tokens). Subtag of
  [bracket](#highlight.tags.bracket).
  */
  paren: Tag;
  /**
  Braces (usually `{` and `}` tokens). Subtag of
  [bracket](#highlight.tags.bracket).
  */
  brace: Tag;
  /**
  Content, for example plain text in XML or markup documents.
  */
  content: Tag;
  /**
  [Content](#highlight.tags.content) that represents a heading.
  */
  heading: Tag;
  /**
  A level 1 [heading](#highlight.tags.heading).
  */
  heading1: Tag;
  /**
  A level 2 [heading](#highlight.tags.heading).
  */
  heading2: Tag;
  /**
  A level 3 [heading](#highlight.tags.heading).
  */
  heading3: Tag;
  /**
  A level 4 [heading](#highlight.tags.heading).
  */
  heading4: Tag;
  /**
  A level 5 [heading](#highlight.tags.heading).
  */
  heading5: Tag;
  /**
  A level 6 [heading](#highlight.tags.heading).
  */
  heading6: Tag;
  /**
  A prose [content](#highlight.tags.content) separator (such as a horizontal rule).
  */
  contentSeparator: Tag;
  /**
  [Content](#highlight.tags.content) that represents a list.
  */
  list: Tag;
  /**
  [Content](#highlight.tags.content) that represents a quote.
  */
  quote: Tag;
  /**
  [Content](#highlight.tags.content) that is emphasized.
  */
  emphasis: Tag;
  /**
  [Content](#highlight.tags.content) that is styled strong.
  */
  strong: Tag;
  /**
  [Content](#highlight.tags.content) that is part of a link.
  */
  link: Tag;
  /**
  [Content](#highlight.tags.content) that is styled as code or
  monospace.
  */
  monospace: Tag;
  /**
  [Content](#highlight.tags.content) that has a strike-through
  style.
  */
  strikethrough: Tag;
  /**
  Inserted text in a change-tracking format.
  */
  inserted: Tag;
  /**
  Deleted text.
  */
  deleted: Tag;
  /**
  Changed text.
  */
  changed: Tag;
  /**
  An invalid or unsyntactic element.
  */
  invalid: Tag;
  /**
  Metadata or meta-instruction.
  */
  meta: Tag;
  /**
  [Metadata](#highlight.tags.meta) that applies to the entire
  document.
  */
  documentMeta: Tag;
  /**
  [Metadata](#highlight.tags.meta) that annotates or adds
  attributes to a given syntactic element.
  */
  annotation: Tag;
  /**
  Processing instruction or preprocessor directive. Subtag of
  [meta](#highlight.tags.meta).
  */
  processingInstruction: Tag;
  /**
  [Modifier](#highlight.Tag^defineModifier) that indicates that a
  given element is being defined. Expected to be used with the
  various [name](#highlight.tags.name) tags.
  */
  definition: (tag: Tag) => Tag;
  /**
  [Modifier](#highlight.Tag^defineModifier) that indicates that
  something is constant. Mostly expected to be used with
  [variable names](#highlight.tags.variableName).
  */
  constant: (tag: Tag) => Tag;
  /**
  [Modifier](#highlight.Tag^defineModifier) used to indicate that
  a [variable](#highlight.tags.variableName) or [property
  name](#highlight.tags.propertyName) is being called or defined
  as a function.
  */
  function: (tag: Tag) => Tag;
  /**
  [Modifier](#highlight.Tag^defineModifier) that can be applied to
  [names](#highlight.tags.name) to indicate that they belong to
  the language's standard environment.
  */
  standard: (tag: Tag) => Tag;
  /**
  [Modifier](#highlight.Tag^defineModifier) that indicates a given
  [names](#highlight.tags.name) is local to some scope.
  */
  local: (tag: Tag) => Tag;
  /**
  A generic variant [modifier](#highlight.Tag^defineModifier) that
  can be used to tag language-specific alternative variants of
  some common tag. It is recommended for themes to define special
  forms of at least the [string](#highlight.tags.string) and
  [variable name](#highlight.tags.variableName) tags, since those
  come up a lot.
  */
  special: (tag: Tag) => Tag;
};
/**
This is a highlighter that adds stable, predictable classes to
tokens, for styling with external CSS.

The following tags are mapped to their name prefixed with `"tok-"`
(for example `"tok-comment"`):

* [`link`](#highlight.tags.link)
* [`heading`](#highlight.tags.heading)
* [`emphasis`](#highlight.tags.emphasis)
* [`strong`](#highlight.tags.strong)
* [`keyword`](#highlight.tags.keyword)
* [`atom`](#highlight.tags.atom)
* [`bool`](#highlight.tags.bool)
* [`url`](#highlight.tags.url)
* [`labelName`](#highlight.tags.labelName)
* [`inserted`](#highlight.tags.inserted)
* [`deleted`](#highlight.tags.deleted)
* [`literal`](#highlight.tags.literal)
* [`string`](#highlight.tags.string)
* [`number`](#highlight.tags.number)
* [`variableName`](#highlight.tags.variableName)
* [`typeName`](#highlight.tags.typeName)
* [`namespace`](#highlight.tags.namespace)
* [`className`](#highlight.tags.className)
* [`macroName`](#highlight.tags.macroName)
* [`propertyName`](#highlight.tags.propertyName)
* [`operator`](#highlight.tags.operator)
* [`comment`](#highlight.tags.comment)
* [`meta`](#highlight.tags.meta)
* [`punctuation`](#highlight.tags.punctuation)
* [`invalid`](#highlight.tags.invalid)

In addition, these mappings are provided:

* [`regexp`](#highlight.tags.regexp),
  [`escape`](#highlight.tags.escape), and
  [`special`](#highlight.tags.special)[`(string)`](#highlight.tags.string)
  are mapped to `"tok-string2"`
* [`special`](#highlight.tags.special)[`(variableName)`](#highlight.tags.variableName)
  to `"tok-variableName2"`
* [`local`](#highlight.tags.local)[`(variableName)`](#highlight.tags.variableName)
  to `"tok-variableName tok-local"`
* [`definition`](#highlight.tags.definition)[`(variableName)`](#highlight.tags.variableName)
  to `"tok-variableName tok-definition"`
* [`definition`](#highlight.tags.definition)[`(propertyName)`](#highlight.tags.propertyName)
  to `"tok-propertyName tok-definition"`
*/
//#endregion
//#region node_modules/@codemirror/language/dist/index.d.ts
/**
A language object manages parsing and per-language
[metadata](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt). Parse data is
managed as a [Lezer](https://lezer.codemirror.net) tree. The class
can be used directly, via the [`LRLanguage`](https://codemirror.net/6/docs/ref/#language.LRLanguage)
subclass for [Lezer](https://lezer.codemirror.net/) LR parsers, or
via the [`StreamLanguage`](https://codemirror.net/6/docs/ref/#language.StreamLanguage) subclass
for stream parsers.
*/
declare class Language {
  /**
  The [language data](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt) facet
  used for this language.
  */
  readonly data: Facet<{
    [name: string]: any;
  }>;
  /**
  A language name.
  */
  readonly name: string;
  /**
  The extension value to install this as the document language.
  */
  readonly extension: Extension;
  /**
  The parser object. Can be useful when using this as a [nested
  parser](https://lezer.codemirror.net/docs/ref#common.Parser).
  */
  parser: Parser;
  /**
  Construct a language object. If you need to invoke this
  directly, first define a data facet with
  [`defineLanguageFacet`](https://codemirror.net/6/docs/ref/#language.defineLanguageFacet), and then
  configure your parser to [attach](https://codemirror.net/6/docs/ref/#language.languageDataProp) it
  to the language's outer syntax node.
  */
  constructor(
  /**
  The [language data](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt) facet
  used for this language.
  */

  data: Facet<{
    [name: string]: any;
  }>, parser: Parser, extraExtensions?: Extension[],
  /**
  A language name.
  */

  name?: string);
  /**
  Query whether this language is active at the given position.
  */
  isActiveAt(state: EditorState, pos: number, side?: -1 | 0 | 1): boolean;
  /**
  Find the document regions that were parsed using this language.
  The returned regions will _include_ any nested languages rooted
  in this language, when those exist.
  */
  findRegions(state: EditorState): {
    from: number;
    to: number;
  }[];
  /**
  Indicates whether this language allows nested languages. The
  default implementation returns true.
  */
  get allowsNesting(): boolean;
}
/**
A subclass of [`Language`](https://codemirror.net/6/docs/ref/#language.Language) for use with Lezer
[LR parsers](https://lezer.codemirror.net/docs/ref#lr.LRParser).
*/
/**
A highlight style associates CSS styles with highlighting
[tags](https://lezer.codemirror.net/docs/ref#highlight.Tag).
*/
declare class HighlightStyle implements Highlighter {
  /**
  The tag styles used to create this highlight style.
  */
  readonly specs: readonly TagStyle[];
  /**
  A style module holding the CSS rules for this highlight style.
  When using
  [`highlightTree`](https://lezer.codemirror.net/docs/ref#highlight.highlightTree)
  outside of the editor, you may want to manually mount this
  module to show the highlighting.
  */
  readonly module: StyleModule | null;
  readonly style: (tags: readonly Tag[]) => string | null;
  readonly scope?: (type: NodeType) => boolean;
  private constructor();
  /**
  Create a highlighter style that associates the given styles to
  the given tags. The specs must be objects that hold a style tag
  or array of tags in their `tag` property, and either a single
  `class` property providing a static CSS class (for highlighter
  that rely on external styling), or a
  [`style-mod`](https://code.haverbeke.berlin/marijn/style-mod#documentation)-style
  set of CSS properties (which define the styling for those tags).
  
  The CSS rules created for a highlighter will be emitted in the
  order of the spec's properties. That means that for elements that
  have multiple tags associated with them, styles defined further
  down in the list will have a higher CSS precedence than styles
  defined earlier.
  */
  static define(specs: readonly TagStyle[], options?: {
    /**
    By default, highlighters apply to the entire document. You can
    scope them to a single language by providing the language
    object or a language's top node type here.
    */
    scope?: Language | NodeType;
    /**
    Add a style to _all_ content. Probably only useful in
    combination with `scope`.
    */
    all?: string | StyleSpec;
    /**
    Specify that this highlight style should only be active then
    the theme is dark or light. By default, it is active
    regardless of theme.
    */
    themeType?: "dark" | "light";
  }): HighlightStyle;
}
/**
Wrap a highlighter in an editor extension that uses it to apply
syntax highlighting to the editor content.

When multiple (non-fallback) styles are provided, the styling
applied is the union of the classes they emit.
*/
declare function syntaxHighlighting(highlighter: Highlighter, options?: {
  /**
  When enabled, this marks the highlighter as a fallback, which
  only takes effect if no other highlighters are registered.
  */
  fallback: boolean;
}): Extension;
/**
Returns the CSS classes (if any) that the highlighters active in
the state would assign to the given style
[tags](https://lezer.codemirror.net/docs/ref#highlight.Tag) and
(optional) language
[scope](https://codemirror.net/6/docs/ref/#language.HighlightStyle^define^options.scope).
*/
/**
The type of object used in
[`HighlightStyle.define`](https://codemirror.net/6/docs/ref/#language.HighlightStyle^define).
Assigns a style to one or more highlighting
[tags](https://lezer.codemirror.net/docs/ref#highlight.Tag), which can either be a fixed class name
(which must be defined elsewhere), or a set of CSS properties, for
which the library will define an anonymous class.
*/
interface TagStyle {
  /**
  The tag or tags to target.
  */
  tag: Tag | readonly Tag[];
  /**
  If given, this maps the tags to a fixed class name.
  */
  class?: string;
  /**
  Any further properties (if `class` isn't given) will be
  interpreted as in style objects given to
  [style-mod](https://code.haverbeke.berlin/marijn/style-mod#documentation).
  (The type here is `any` because of TypeScript limitations.)
  */
  [styleProperty: string]: any;
}
/**
A default highlight style (works well with light themes).
*/
//#endregion
export { EditorState, EditorView, HighlightStyle, basicSetup, javascript, markdown, minimalSetup, syntaxHighlighting, tags, yCollab };