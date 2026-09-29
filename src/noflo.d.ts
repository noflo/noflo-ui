/**
 * Ambient type declarations for the `noflo` package, which ships no TypeScript
 * definitions. Only the surface actually used by this project is declared;
 * anything beyond it falls through to the index signatures.
 */

declare module "noflo" {
  export interface NoFloGraph {
    nodes: Array<Record<string, any>>;
    edges: Array<Record<string, any>>;
    initializers: Array<Record<string, any>>;
    inports: Record<string, any>;
    outports: Record<string, any>;
    toJSON(): Record<string, any>;
    [key: string]: any;
  }

  export const Graph: {
    new (name?: string): NoFloGraph;
    readonly prototype: NoFloGraph;
  };

  export const graph: {
    loadJSON(json: unknown): Promise<NoFloGraph>;
    loadFBP(source: string): Promise<NoFloGraph>;
    [key: string]: any;
  };
}
