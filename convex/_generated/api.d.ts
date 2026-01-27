/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as categorization from "../categorization.js";
import type * as clawdhubSync from "../clawdhubSync.js";
import type * as crons from "../crons.js";
import type * as lib_embeddings from "../lib/embeddings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  categorization: typeof categorization;
  clawdhubSync: typeof clawdhubSync;
  crons: typeof crons;
  "lib/embeddings": typeof lib_embeddings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
