/**
 * K-Means Clustering Algorithm
 * Used for detecting accident-prone hotspots.
 */

export interface Point {
  lat: number;
  lng: number;
  weight?: number;
}

export class KMeans {
  static distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
  }

  static cluster(points: Point[], k: number, iterations: number = 20) {
    if (points.length === 0) return [];

    // Initialize centroids randomly
    let centroids = points.slice(0, k).map(p => ({ ...p }));
    let clusters: Point[][] = Array.from({ length: k }, () => []);

    for (let i = 0; i < iterations; i++) {
      clusters = Array.from({ length: k }, () => []);

      // Assign points to nearest centroid
      for (const point of points) {
        let minDist = Infinity;
        let clusterIdx = 0;

        for (let j = 0; j < k; j++) {
          const dist = this.distance(point, centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            clusterIdx = j;
          }
        }
        clusters[clusterIdx].push(point);
      }

      // Update centroids
      for (let j = 0; j < k; j++) {
        if (clusters[j].length === 0) continue;

        const sumLat = clusters[j].reduce((acc, p) => acc + p.lat, 0);
        const sumLng = clusters[j].reduce((acc, p) => acc + p.lng, 0);

        centroids[j] = {
          lat: sumLat / clusters[j].length,
          lng: sumLng / clusters[j].length,
        };
      }
    }

    return centroids.map((c, i) => ({
      centroid: c,
      points: clusters[i],
    }));
  }
}
