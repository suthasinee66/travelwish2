export interface TripAccommodation {
  id: string | null;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  source?: "user" | "travelwish" | "google_maps" | "booking_link" | "ai_verified";
  source_url?: string | null;
  booking_provider?: string | null;
  images?: string[] | null;
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
