/**
 * Greedy Assignment Algorithm for Ambulances
 * Assigns the nearest available ambulance to an accident site.
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Ambulance {
  id: string;
  lat: number;
  lng: number;
  status: 'available' | 'busy' | 'offline';
}

export class AssignmentEngine {
  static getDistance(p1: Coordinate, p2: Coordinate): number {
    // Basic Euclidean distance for calculation
    return Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
  }

  static assignBestAmbulance(accident: Coordinate, ambulances: Ambulance[]) {
    const availableAmbulances = ambulances.filter(a => a.status === 'available');

    if (availableAmbulances.length === 0) {
      return null;
    }

    let bestAmbulance = availableAmbulances[0];
    let minDistance = this.getDistance(accident, bestAmbulance);

    for (const amb of availableAmbulances) {
      const dist = this.getDistance(accident, amb);
      if (dist < minDistance) {
        minDistance = dist;
        bestAmbulance = amb;
      }
    }

    return {
      ambulance: bestAmbulance,
      distance: minDistance,
      estimatedMinutes: Math.round(minDistance * 100) // Mock travel time calc
    };
  }
}
