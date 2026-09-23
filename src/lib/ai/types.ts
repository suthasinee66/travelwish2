export interface TripAccommodation {
  id: string | null;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  source?: "user" | "travelwish" | "ai_verified";
}

export interface TripPlanInput {

 province:string;

 days:number;

 budget:number;

 companion:string;

 travelType:string[];

 activities:string[];

 atmosphere:string|null;

 accommodation?: TripAccommodation | null;

}
