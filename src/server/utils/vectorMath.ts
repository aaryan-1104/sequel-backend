/**
 * Fast dense vector mathematics for semantic similarity and taste centroids.
 */

/**
 * Calculates dot product between two equal-length vectors.
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Calculates Euclidean magnitude (L2 norm) of a vector.
 */
export function magnitude(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  return Math.sqrt(sum);
}

/**
 * Normalizes vector to unit length (L2 norm = 1.0).
 */
export function normalize(v: number[]): number[] {
  const mag = magnitude(v);
  if (mag === 0) return v;
  return v.map((x) => x / mag);
}

/**
 * Computes Cosine Similarity between vector A and vector B.
 * Returns a value between -1.0 and 1.0 (typically 0.0 to 1.0 for embeddings).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Computes the weighted centroid (average taste vector) and normalizes to unit length.
 */
export function calculateCentroid(
  weightedVectors: Array<{ vector: number[]; weight: number }>
): number[] | null {
  if (!weightedVectors || weightedVectors.length === 0) return null;

  const validItems = weightedVectors.filter(
    (item) => item.vector && item.vector.length > 0 && item.weight > 0
  );
  if (validItems.length === 0) return null;

  const dim = validItems[0].vector.length;
  const centroid = new Array(dim).fill(0);
  let totalWeight = 0;

  for (const { vector, weight } of validItems) {
    if (vector.length !== dim) continue;
    totalWeight += weight;
    for (let i = 0; i < dim; i++) {
      centroid[i] += vector[i] * weight;
    }
  }

  if (totalWeight === 0) return null;

  for (let i = 0; i < dim; i++) {
    centroid[i] /= totalWeight;
  }

  return normalize(centroid);
}
