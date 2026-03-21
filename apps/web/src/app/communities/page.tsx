"use client";

// AUTO-GENERATED DATA — do not edit by hand
// Source: HBx/data/communities.json + Supabase divisions table

const DIVISIONS: Record<string, { name: string; region: string; timezone: string }> = {
  "boise": { name: "Boise", region: "Pacific Northwest", timezone: "America/Boise" },
  "delaware-beaches": { name: "Delaware Beaches", region: "Mid-Atlantic", timezone: "America/New_York" },
  "nashville": { name: "Nashville", region: "Southeast", timezone: "America/Chicago" },
  "richmond": { name: "Richmond", region: "Mid-Atlantic", timezone: "America/New_York" },
};

interface Community {
  id: string; division: string; name: string; slug: string | null;
  status: string | null; city: string | null; state: string | null;
  price_from: number | null; price_to: number | null;
  is_55_plus: boolean; has_model: boolean; has_lotworks: boolean;
  hoa_fee: number | null; hoa_period: string | null;
  natural_gas: string | null; electric: string | null; water: string | null;
  sewer: string | null; cable_internet: string | null; trash: string | null;
  amenities: string | null;
}

const COMMUNITIES: Community[] = [
  { id: "a927bf1e-a80d-4e94-99ce-98c69ca7c62d", division: "boise", name: "Inspirado", slug: "inspirado", status: "now-selling", city: "Meridian", state: "ID", price_from: 719900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: "Pickleball; Playground; Pool; Clubhouse; PoolHouse; Parks" },
  { id: "364ea792-fd43-45e5-8c20-e638cfcb07ac", division: "boise", name: "Legacy", slug: "legacy", status: "active", city: "Eagle", state: "ID", price_from: 796900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: "Soccer; Tennis; Pickleball; GolfCourse; Pool; Trails; TotLot; PoolHouse; Shopping; Parks" },
  { id: "ecb01d2b-bfbc-47b0-96ab-7a892039fec1", division: "boise", name: "Mayfield Springs", slug: "mayfield-springs", status: "coming-soon", city: "Boise", state: "ID", price_from: null, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "1d5a5159-64ff-4925-9d70-d414d013d84f", division: "boise", name: "Millstone Farm", slug: "millstone-farm", status: "active", city: "Eagle", state: "ID", price_from: 867900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: "Basketball; Pickleball; Playground; Pool; Trails; PoolHouse; Pavillion" },
  { id: "b14f1ac6-7af4-4a68-b758-ef6dc7b746ca", division: "boise", name: "Seneca Springs", slug: "seneca-springs", status: "active", city: "Star", state: "ID", price_from: 749900, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "508c08ef-381f-498c-a219-9296232fa399", division: "boise", name: "Terra View", slug: "terra-view", status: "active", city: "Eagle", state: "ID", price_from: 894900, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: "Playground; Pool; Park; Clubhouse; SplashPad" },
  { id: "e2630a84-2491-4293-a63f-fe1a1b3ebb30", division: "delaware-beaches", name: "Autumndale", slug: "autumndale", status: "active", city: "Harbeson", state: "DE", price_from: 464900, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 211, hoa_period: "monthly", natural_gas: "Chesapeake Utilities", electric: "Delaware Electric Cooperative", water: "Artesian", sewer: "Artesian", cable_internet: "Verizon Fios", trash: "Included in HOA", amenities: "FitnessCenter; Pool; Trails; CoffeeBar; Courtyard" },
  { id: "72bf08f0-de3f-4954-ba7f-5d224e53025b", division: "delaware-beaches", name: "Bayside", slug: "bayside", status: "active", city: null, state: null, price_from: null, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: null, hoa_period: null, natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "5eadca88-ff30-45e1-9a84-ca28a7febd03", division: "delaware-beaches", name: "Black Oak", slug: "black-oak", status: "active", city: "Lewes", state: "DE", price_from: 790400, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: 281, hoa_period: "monthly", natural_gas: "Chesapeake Utilities", electric: "Delaware Electric Coop", water: "Tidewater Utilities", sewer: "Sussex County", cable_internet: null, trash: "Included in HOA", amenities: "Pool; Pickleball Courts; Tot Lot; Clubhouse; Gym" },
  { id: "e3e82055-b6c0-4f5f-a91d-0332b2be30ba", division: "delaware-beaches", name: "Brentwood", slug: "brentwood", status: "active", city: "Lewes", state: "DE", price_from: 545400, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 222, hoa_period: "monthly", natural_gas: "Chesapeake", electric: "DEC Electric", water: "Tidewater", sewer: "Sussex County", cable_internet: null, trash: "Included in HOA", amenities: "Clubhouse; FitnessCenter; Pickleball; Pool; SportsField" },
  { id: "ecfa4e0f-a73e-45f2-bd41-9cd98e45aeb2", division: "delaware-beaches", name: "Cardinal Grove", slug: "cardinal-grove", status: "active", city: "Lewes", state: "DE", price_from: 500400, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 274, hoa_period: "monthly", natural_gas: "Chesapeake", electric: "Delmarva Power", water: "Tidewater", sewer: "Sussex County", cable_internet: "Verizon Fios", trash: "Included in HOA", amenities: "Cornhole; Pool; PoolHouse; Cabanas; TotLot" },
  { id: "101cdafd-e35e-4d89-a10f-9aa4280547ef", division: "delaware-beaches", name: "Channel Pointe", slug: "channel-pointe", status: "active", city: "Selbyville", state: "DE", price_from: 1035400, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 525, hoa_period: "monthly", natural_gas: "Chesapeake", electric: "DEC Electric", water: "Artesian", sewer: "Sussex County", cable_internet: null, trash: "Included in HOA", amenities: null },
  { id: "989f39ac-6282-447a-99e4-31b597e1c91f", division: "delaware-beaches", name: "Fisher's Cove", slug: "fishers-cove", status: "active", city: "Lewes", state: "DE", price_from: 1451400, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: 208, hoa_period: "monthly", natural_gas: null, electric: "Lewes' Board of Public Works", water: "Lewes' Board of Public Works", sewer: "Lewes' Board of Public Works", cable_internet: "Comcast", trash: null, amenities: null },
  { id: "f6afbb46-3aaf-408b-8c81-755e733f36d2", division: "delaware-beaches", name: "Independence", slug: "independence", status: "now-selling", city: "Millsboro", state: "DE", price_from: null, price_to: null, is_55_plus: true, has_model: false, has_lotworks: true, hoa_fee: 433, hoa_period: "monthly", natural_gas: "Poore's Propane", electric: "Delaware Electric Cooperative", water: "Artesian", sewer: "Artesian", cable_internet: "Verizon Fios", trash: "Included in HOA", amenities: "24,000 sq.ft. Clubhouse; Activities and Lifestyle Director; Indoor Pool; Outdoor Pool; State-of-the-Art Fitness Center; Locker Room with Wet Saunas; Yoga and Dance Studio; Massage Room; Bar with Grill; Grand Ballroom with Commercial Kitchen; Library; Putting Green; Walking Trails; Tennis Courts; Pickleball Courts; Community Garden; Dog Park; BBQ Grill Area; Horseshoe Pits; Sand Volleyball Courts" },
  { id: "1f1213de-e3c6-4ca9-a0b9-9b5ae97d181c", division: "delaware-beaches", name: "Lightship Cove", slug: "lightship-cove", status: "active", city: "Milton", state: "DE", price_from: 485400, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 166, hoa_period: "monthly", natural_gas: "Chesapeake", electric: "Delmarva Power", water: null, sewer: "Artesian", cable_internet: null, trash: "Included in HOA", amenities: "CrabShack; Pickleball; Pool; PoolHouse; TotLot" },
  { id: "6206ee53-3802-435b-92d2-531360426223", division: "delaware-beaches", name: "Miralon", slug: "miralon", status: "active", city: "Milton", state: "DE", price_from: 595400, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 168, hoa_period: "monthly", natural_gas: "Chesapeake", electric: "Delmarva Power", water: null, sewer: "Artesian", cable_internet: null, trash: "Included in HOA", amenities: "FitnessCenter; GrillingArea; Pickleball; Pool; Sauna; Trails" },
  { id: "7a07fc08-0ecd-457c-8640-d9eccfa0b310", division: "delaware-beaches", name: "Monarch", slug: "monarch", status: "active", city: "Middletown", state: "DE", price_from: 640400, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: 201, hoa_period: "monthly", natural_gas: "Delmarva Power", electric: "Delmarva Power", water: "Artesian", sewer: "New Castle County", cable_internet: "Comcast", trash: "Included in HOA", amenities: "Outdoor Pool; Splash Pad; Pickleball Courts; Multi-Sport Courts; 4-Mile Walking Trail; Clubhouse & Event Space; State-of-the-Art Fitness Center; Golf Simulator; Coffee Lounge; Game Room; Outdoor Bar; Community Garden; Tot Lot" },
  { id: "d170c31c-1225-4ced-869f-a555262c49b2", division: "delaware-beaches", name: "Olde Town at Lewes", slug: "olde-town-at-lewes", status: "active", city: "Lewes", state: "DE", price_from: null, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: 250, hoa_period: "monthly", natural_gas: "Chesapeake Utilities", electric: "Lewes Board of Public Works", water: "Lewes Board of Public Works", sewer: "Lewes Board of Public Works", cable_internet: "Comcast", trash: null, amenities: "Fireplace; Pool; PoolHouse; Shopping; Trails" },
  { id: "d51c1fcd-e3fc-432c-982a-7966fed1d491", division: "delaware-beaches", name: "On Your Property in Delaware", slug: "branch-out", status: "active", city: null, state: "DE", price_from: 429900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "da977ce5-8957-4988-88ce-551d32730bd7", division: "delaware-beaches", name: "Peninsula Lakes", slug: "peninsula-lakes", status: "active", city: "Millsboro", state: "DE", price_from: null, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 255, hoa_period: "monthly", natural_gas: "Chesapeake Utilities", electric: "Delaware Electric Cooperative", water: "Tidewater Utilities", sewer: "Sussex County", cable_internet: "Verizon Fios", trash: "Included in HOA", amenities: "Tennis; Pickleball; Pool; Lake; Pond; Trails; Clubhouse; FitnessCenter; TotLot; BocceCourts" },
  { id: "d3873c23-9969-4d6d-a996-fc20fcf0a444", division: "delaware-beaches", name: "Red Cedar Farms", slug: "red-cedar-farms", status: "coming-soon", city: "Milford", state: "DE", price_from: null, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "3146c140-392a-4045-beb2-954ba27fb18b", division: "delaware-beaches", name: "Riverwood", slug: "riverwood", status: "active", city: "Harbeson", state: "DE", price_from: 509900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: 236, hoa_period: "monthly", natural_gas: "Chesapeake", electric: "Delaware Electric Cooperative", water: "Artesian", sewer: "Artesian", cable_internet: null, trash: "Included in HOA", amenities: "Clubhouse; FitnessCenter; Pool; Trails" },
  { id: "b3305fd2-9a09-4465-8cd5-b57283e3f792", division: "delaware-beaches", name: "Serenity at Cubbage Pond", slug: "serenity-at-cubbage-pond", status: "active", city: "Lincoln", state: "DE", price_from: 509900, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 71, hoa_period: "monthly", natural_gas: "Poore's Propane", electric: "Delmarva Power", water: "Well", sewer: "Septic", cable_internet: null, trash: null, amenities: null },
  { id: "d23db485-121a-4f81-a4d6-2388b34ba252", division: "delaware-beaches", name: "Sunrise", slug: "sunrise", status: "active", city: "Bethany Beach", state: "DE", price_from: 3950000, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: 361, hoa_period: "monthly", natural_gas: null, electric: "Delmarva Power", water: "Sussex Shores", sewer: "Sussex County", cable_internet: null, trash: null, amenities: null },
  { id: "07ba6691-6b5f-4d20-9fcb-30a9146936c0", division: "delaware-beaches", name: "The Estates at Bridgewater", slug: "the-estates-at-bridgewater", status: "active", city: "Frankford", state: "DE", price_from: 640400, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 308, hoa_period: "monthly", natural_gas: "Chesapeake", electric: "Delaware Electric Cooperative", water: "Artesian", sewer: "Sussex County", cable_internet: "Mediacom", trash: "Included in HOA", amenities: "Pickleball; Pool; Clubhouse; FitnessCenter; TotLot; GrillingArea; GameRoom" },
  { id: "0a88a560-255f-4cdf-8e50-f7a506b29b72", division: "delaware-beaches", name: "The Overlook Lewes", slug: "overlook-lewes", status: "sold-out", city: "Lewes", state: "DE", price_from: null, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "8b3c1e10-5dae-42ca-b60b-d74cfac1dee5", division: "delaware-beaches", name: "The Peninsula", slug: "the-peninsula", status: "active", city: "Millsboro", state: "DE", price_from: null, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 399, hoa_period: "monthly", natural_gas: null, electric: "Delaware Electric Cooperative", water: "Tidewater Utilities", sewer: "Sussex County", cable_internet: "Verizon Fios", trash: "Included in HOA", amenities: "Tennis; Pickleball; GolfCourse; Beach; Trails; Clubhouse; Pool; Restaurant; Spa" },
  { id: "07aee626-b37d-470f-8069-4e88b08d4a54", division: "delaware-beaches", name: "Walden", slug: "walden", status: "active", city: "Harbeson", state: "DE", price_from: 520400, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 125, hoa_period: "monthly", natural_gas: "Chesapeake Utilities", electric: "Delaware Electric Cooperative", water: "Tidewater Utilities", sewer: "Sussex County", cable_internet: "Verizon Fios", trash: "Included in HOA", amenities: "Pickleball; Pool; Clubhouse; FitnessCenter; TotLot; GrillingArea; GameRoom; KayakLaunch; Marina; SportsCourt" },
  { id: "63ec6c03-2a1c-4e6c-9cee-b378ad77adff", division: "delaware-beaches", name: "Welches Pond", slug: "welches-pond", status: "active", city: "Lewes", state: "DE", price_from: 637400, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 295, hoa_period: "monthly", natural_gas: "Chesapeake Utilities", electric: "Delaware Electric Cooperative", water: "Tidewater Utilities", sewer: "Sussex County", cable_internet: "Mediacom", trash: "Included in HOA", amenities: "Basketball; Tennis; Pickleball; Pool; Clubhouse; FitnessCenter; KayakLaunch; Parks; Pavillion" },
  { id: "21bfd7d9-5cc9-4cf4-8aa1-dcd754e729d2", division: "nashville", name: "Campbell Crossing", slug: "campbell-crossing", status: "active", city: "Hendersonville", state: "TN", price_from: 979900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "6ad5f972-1b73-41c4-ad47-68d0dfd26a9a", division: "nashville", name: "Durham Farms", slug: "durham-farms", status: "last-chance", city: "Hendersonville", state: "TN", price_from: 843700, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: "Clubhouse; FitnessCenter; TotLot; Trails; Pool" },
  { id: "6460d82b-312f-4d4f-953a-3de77a02dfde", division: "nashville", name: "Fox Creek", slug: "fox-creek", status: "coming-soon", city: "Gallatin", state: "TN", price_from: null, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "52c5d95f-38a1-421c-999f-052d244c08a3", division: "nashville", name: "MacGregory Downs", slug: "macgregory-downs", status: "coming-soon", city: "Gallatin", state: "TN", price_from: null, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "0c5d99bf-9813-4753-8fc1-0602fdc1ae3f", division: "nashville", name: "Millstone", slug: "millstone", status: "active", city: "Hendersonville", state: "TN", price_from: 694900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: "Playground; Pool; Clubhouse; FitnessCenter; SplashPad" },
  { id: "33abc506-47fe-46a7-aae0-ae0b878739fd", division: "nashville", name: "Oak Creek Estates", slug: "oak-creek-estates", status: "active", city: "Hendersonville", state: "TN", price_from: 949900, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: "Cornhole; Creek; Trails" },
  { id: "3b6cac5b-0991-4f73-ac50-5a49505bfeb6", division: "nashville", name: "Oak Hall IV", slug: "oak-hall-iv", status: "active", city: "Mt. Juliet", state: "TN", price_from: 644900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "51abd408-891b-4d6f-a080-972be7289e3c", division: "nashville", name: "The Landing at Branham", slug: "the-landing-at-branham", status: "sold-out", city: "Gallatin", state: "TN", price_from: null, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "f6337ba9-4fe3-4d8b-a066-2ad5a792a34d", division: "nashville", name: "The Reserve at Horn Springs", slug: "the-reserve-at-horn-springs", status: "active", city: "Lebanon", state: "TN", price_from: 799900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "262004cc-acbe-4e24-858c-9ac834713026", division: "nashville", name: "Yorkshire Estates", slug: "yorkshire-estates", status: "coming-soon", city: "Mt. Juliet", state: "TN", price_from: null, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "f62863a2-bc3e-4e15-827e-90b33f408a5a", division: "richmond", name: "Barrington at Magnolia Green", slug: "barrington-at-magnolia-green", status: "active", city: "Moseley", state: "VA", price_from: 799900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: 313, hoa_period: "monthly", natural_gas: "Columbia Natural Gas", electric: "Dominion Energy", water: null, sewer: "Chesterfield County", cable_internet: "Verizon and Comcast", trash: null, amenities: "Tennis; Pickleball; GolfCourse; Playground; Pool; Park; Trails; Clubhouse; Restaurant" },
  { id: "aa4d4ea1-c32b-4198-aaf3-64cf7e5e6989", division: "richmond", name: "Eagle Bend at Magnolia Green", slug: "eagle-bend-at-magnolia-green", status: "active", city: "Moseley", state: "VA", price_from: 729900, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 313, hoa_period: "monthly", natural_gas: "Columbia Natural Gas", electric: "Dominion Virginia Power", water: "Chesterfield County", sewer: null, cable_internet: "Verizon and Comcast", trash: null, amenities: "Tennis; Pickleball; GolfCourse; Playground; Pool; Park; Trails; Clubhouse; Restaurant" },
  { id: "6d5464aa-04ad-4d2d-96ef-1fcef0780bd5", division: "richmond", name: "Harpers Mill", slug: "harpers-mill", status: "coming-soon", city: "Chesterfield", state: "VA", price_from: null, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "97c7e32c-2b5c-46a2-8d75-169d083624ee", division: "richmond", name: "Nantucket Mews", slug: "nantucket-mews", status: "last-chance", city: "Ashland", state: "VA", price_from: null, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: 450, hoa_period: "monthly", natural_gas: null, electric: "Dominion Power", water: null, sewer: "Henrico County", cable_internet: "Verizon and Comcast", trash: null, amenities: null },
  { id: "5327024a-fff8-4c0a-a251-3532611bc980", division: "richmond", name: "NewMarket at RounTrey", slug: "newmarket-at-rountrey", status: "active", city: "Midlothian", state: "VA", price_from: 564900, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: "Columbia Gas", electric: "Dominion Power", water: null, sewer: null, cable_internet: "Verizon Fios and Comcast", trash: null, amenities: "Clubhouse; FitnessCenter; Pool; Tennis; Trails; Playground" },
  { id: "08fb07fd-2c1c-4742-9607-30b96d6e7612", division: "richmond", name: "On Your Property in Richmond", slug: "branch-out-ric", status: "active", city: null, state: "VA", price_from: 459900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "945acfc4-2bbe-4ea8-8a2f-5372a0b48650", division: "richmond", name: "RounTrey", slug: "rountrey", status: "active", city: "Midlothian", state: "VA", price_from: 699900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: 275, hoa_period: "monthly", natural_gas: "Columbia Gas", electric: "Dominion Power", water: null, sewer: null, cable_internet: "Verizon Fios and Comcast", trash: null, amenities: "Resort-style Pools; Tennis Court; Clubhouse; Fitness Center; Playground; Walking & Hiking Trails; Dog Parks; Swift Creek Reservoir Access" },
  { id: "08bfab20-4979-4ef6-98b0-e32e8707ff73", division: "richmond", name: "StillCroft", slug: "stillcroft", status: "active", city: "Ashland", state: "VA", price_from: 914900, price_to: null, is_55_plus: false, has_model: true, has_lotworks: true, hoa_fee: 150, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: "Gated Community; 5+ Acre Homesites; Tree Preservation Areas; Walk-out Basement Options" },
  { id: "6b544bfa-3f74-4ede-ab4d-857a48372b02", division: "richmond", name: "Summer Lake", slug: "summer-lake", status: "active", city: "Moseley", state: "VA", price_from: 649000, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: 365, hoa_period: "monthly", natural_gas: "Buried Propane", electric: "Dominion Energy", water: null, sewer: "Chesterfield County", cable_internet: "Comcast and Verizon", trash: null, amenities: "Basketball; Tennis; Pickleball; Playground; Pool; Trails; Clubhouse; FitnessCenter; SplashPad" },
  { id: "f473bbc1-0e8d-4413-aa14-26f718bfb785", division: "richmond", name: "Village at Hidden Rock", slug: "village-at-hidden-rock", status: "coming-soon", city: "Maidens", state: "VA", price_from: null, price_to: null, is_55_plus: false, has_model: false, has_lotworks: false, hoa_fee: null, hoa_period: "monthly", natural_gas: null, electric: null, water: null, sewer: null, cable_internet: null, trash: null, amenities: null },
  { id: "407d4bf6-25c9-4c04-afc4-7da965613879", division: "richmond", name: "Weatherbury", slug: "weatherbury", status: "active", city: "Moseley", state: "VA", price_from: 789900, price_to: null, is_55_plus: false, has_model: false, has_lotworks: true, hoa_fee: null, hoa_period: "monthly", natural_gas: "Buried Propane", electric: "Dominion Energy", water: null, sewer: "Chesterfield County", cable_internet: "Comcast & Verizon", trash: null, amenities: null },
];

// ---------------------------------------------------------------------------
// Helper components & constants
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  "active":      "bg-[#1a2a1a] text-[#00c853] border border-[#1f3f1f]",
  "now-selling": "bg-[#1a1f2e] text-[#0070f3] border border-[#1a2a3f]",
  "coming-soon": "bg-[#2a2a1a] text-[#f5a623] border border-[#3f3a1f]",
  "last-chance": "bg-[#2a1a1a] text-[#ff6b6b] border border-[#3f1f1f]",
  "sold-out":    "bg-[#1a1a1a] text-[#555555] border border-[#2a2a2a]",
};

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "active";
  const cls = STATUS_STYLES[s] ?? STATUS_STYLES["active"];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded ${cls}`}>
      {s.replace(/-/g, " ")}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-[#555555] uppercase tracking-widest mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1 border-b border-[#161616]">
      <span className="text-[11px] text-[#555555]">{label}</span>
      <span className="text-[12px] text-[#a1a1a1] text-right max-w-[280px]">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort helper
// ---------------------------------------------------------------------------

type SortCol = "name" | "division" | "status" | "city" | "price_from" | "hoa_fee";

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CommunitiesPage() {
  const [view, setView] = useState<"card" | "table">("card");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [selected, setSelected] = useState<Community | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Restore view preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("communities-view");
    if (saved === "card" || saved === "table") {
      setView(saved);
    }
  }, []);

  // Persist view preference
  function handleSetView(v: "card" | "table") {
    setView(v);
    localStorage.setItem("communities-view", v);
  }

  // Filtered + sorted data
  const rows = COMMUNITIES
    .filter((c) => divisionFilter === "all" || c.division === divisionFilter)
    .sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const av = (a as any)[sortCol] ?? "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bv = (b as any)[sortCol] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  function sortIndicator(col: SortCol) {
    if (sortCol !== col) return null;
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  // Nav items
  const navItems = [
    { label: "Dashboard",   href: "/" },
    { label: "Status",      href: "/status" },
    { label: "Communities", href: "/communities" },
    { label: "Divisions",   href: "/divisions" },
  ];

  return (
    <div
      style={{ backgroundColor: "#0a0a0a", color: "#ededed", minHeight: "100vh" }}
      className="flex"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Sidebar                                                              */}
      {/* ------------------------------------------------------------------ */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          backgroundColor: "#111111",
          borderRight: "1px solid #1f1f1f",
        }}
        className="flex flex-col h-screen sticky top-0"
      >
        {/* Logo / brand */}
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid #1f1f1f",
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#ededed",
              letterSpacing: "-0.02em",
            }}
          >
            HBx
          </span>
          <span
            style={{
              fontSize: 11,
              color: "#555555",
              display: "block",
              marginTop: 2,
            }}
          >
            Pulse v2
          </span>
        </div>

        {/* Nav */}
        <nav style={{ padding: "12px 10px", flex: 1 }}>
          {navItems.map((item) => {
            const isActive = item.href === "/communities";
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  padding: "7px 12px",
                  marginBottom: 2,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? "#ededed" : "#a1a1a1",
                  backgroundColor: isActive ? "#1a1a1a" : "transparent",
                  textDecoration: "none",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Main content                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header
          style={{
            backgroundColor: "#111111",
            borderBottom: "1px solid #1f1f1f",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#ededed",
              margin: 0,
            }}
          >
            Communities
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Division filter */}
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              style={{
                backgroundColor: "#111111",
                border: "1px solid #2a2a2a",
                color: "#a1a1a1",
                fontSize: 12,
                borderRadius: 6,
                padding: "6px 12px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All Divisions</option>
              <option value="boise">Boise</option>
              <option value="delaware-beaches">Delaware Beaches</option>
              <option value="nashville">Nashville</option>
              <option value="richmond">Richmond</option>
            </select>

            {/* View toggle */}
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => handleSetView("card")}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 14,
                  border: "1px solid #2a2a2a",
                  cursor: "pointer",
                  backgroundColor: view === "card" ? "#1a1a1a" : "transparent",
                  color: view === "card" ? "#ededed" : "#555555",
                  lineHeight: 1,
                }}
                title="Card view"
              >
                ⊞
              </button>
              <button
                onClick={() => handleSetView("table")}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 14,
                  border: "1px solid #2a2a2a",
                  cursor: "pointer",
                  backgroundColor: view === "table" ? "#1a1a1a" : "transparent",
                  color: view === "table" ? "#ededed" : "#555555",
                  lineHeight: 1,
                }}
                title="Table view"
              >
                ≡
              </button>
            </div>
          </div>
        </header>

        {/* Page body */}
        <main style={{ padding: 24, flex: 1, overflowY: "auto" }}>
          {view === "card" ? (
            // ----------------------------------------------------------
            // Card grid
            // ----------------------------------------------------------
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rows.map((c) => {
                const amenityList = c.amenities
                  ? c.amenities.split(";").map((a) => a.trim()).filter(Boolean)
                  : [];
                const visibleAmenities = amenityList.slice(0, 3);
                const extraCount = amenityList.length - 3;
                const location =
                  c.city && c.state
                    ? `${c.city}, ${c.state}`
                    : c.state
                    ? c.state
                    : "—";

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelected(c)}
                    style={{
                      borderRadius: 8,
                      border: "1px solid #1f1f1f",
                      backgroundColor: "#111111",
                      padding: 16,
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "#2f2f2f";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "#1f1f1f";
                    }}
                  >
                    {/* Top row: division + status */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 10,
                          color: "#555555",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {DIVISIONS[c.division]?.name ?? c.division}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>

                    {/* Name */}
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#ededed",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      {c.name}
                      {c.is_55_plus && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: "1px 5px",
                            borderRadius: 4,
                            backgroundColor: "#1a1f2e",
                            color: "#0070f3",
                            border: "1px solid #1a2a3f",
                          }}
                        >
                          55+
                        </span>
                      )}
                    </div>

                    {/* Location */}
                    <div style={{ marginTop: 2, fontSize: 12, color: "#666666" }}>
                      {location}
                    </div>

                    {/* Price + HOA */}
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: "#ededed",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      {c.price_from
                        ? `From $${c.price_from.toLocaleString()}`
                        : "Price TBD"}
                      {c.hoa_fee && (
                        <span style={{ color: "#666666" }}>
                          · ${c.hoa_fee.toLocaleString()}/mo HOA
                        </span>
                      )}
                    </div>

                    {/* Amenity tags */}
                    {amenityList.length > 0 && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4,
                        }}
                      >
                        {visibleAmenities.map((a) => (
                          <span
                            key={a}
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              backgroundColor: "#161616",
                              border: "1px solid #2a2a2a",
                              color: "#888888",
                            }}
                          >
                            {a}
                          </span>
                        ))}
                        {extraCount > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              backgroundColor: "#161616",
                              border: "1px solid #2a2a2a",
                              color: "#555555",
                            }}
                          >
                            +{extraCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // ----------------------------------------------------------
            // Table view
            // ----------------------------------------------------------
            <div
              style={{
                overflowX: "auto",
                borderRadius: 8,
                border: "1px solid #1f1f1f",
              }}
            >
              <table
                style={{
                  width: "100%",
                  fontSize: 12,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#0d0d0d" }}>
                    {(
                      [
                        { label: "Name",       col: "name"       },
                        { label: "Division",   col: "division"   },
                        { label: "Status",     col: "status"     },
                        { label: "Location",   col: "city"       },
                        { label: "Price From", col: "price_from" },
                        { label: "HOA",        col: "hoa_fee"    },
                        { label: "55+",        col: null         },
                        { label: "Model",      col: null         },
                        { label: "Amenities",  col: null         },
                      ] as { label: string; col: SortCol | null }[]
                    ).map(({ label, col }, i) => (
                      <th
                        key={label}
                        onClick={col ? () => toggleSort(col) : undefined}
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          whiteSpace: "nowrap",
                          borderBottom: "1px solid #1f1f1f",
                          cursor: col ? "pointer" : "default",
                          userSelect: "none",
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: col && sortCol === col ? "#888888" : "#555555",
                          position: i === 0 ? "sticky" : undefined,
                          left: i === 0 ? 0 : undefined,
                          backgroundColor: "#0d0d0d",
                          zIndex: i === 0 ? 1 : undefined,
                        }}
                      >
                        {label}
                        {col && sortIndicator(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const location =
                      c.city && c.state
                        ? `${c.city}, ${c.state}`
                        : c.state
                        ? c.state
                        : "—";
                    const amenityStr = c.amenities
                      ? c.amenities.length > 50
                        ? c.amenities.slice(0, 50) + "…"
                        : c.amenities
                      : "—";

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c)}
                        style={{
                          borderBottom: "1px solid #1a1a1a",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#111111";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
                        }}
                      >
                        {/* Name — sticky */}
                        <td
                          style={{
                            padding: "10px 16px",
                            whiteSpace: "nowrap",
                            color: "#ededed",
                            fontWeight: 500,
                            position: "sticky",
                            left: 0,
                            backgroundColor: "#0a0a0a",
                          }}
                        >
                          {c.name}
                        </td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap", color: "#a1a1a1" }}>
                          {DIVISIONS[c.division]?.name ?? c.division}
                        </td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                          <StatusBadge status={c.status} />
                        </td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap", color: "#a1a1a1" }}>
                          {location}
                        </td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap", color: "#a1a1a1" }}>
                          {c.price_from ? `$${c.price_from.toLocaleString()}` : "—"}
                        </td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap", color: "#a1a1a1" }}>
                          {c.hoa_fee ? `$${c.hoa_fee}/mo` : "—"}
                        </td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap", color: "#a1a1a1" }}>
                          {c.is_55_plus ? "Yes" : "—"}
                        </td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap", color: "#a1a1a1" }}>
                          {c.has_model ? "Yes" : "—"}
                        </td>
                        <td style={{ padding: "10px 16px", color: "#a1a1a1" }}>
                          {amenityStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Slide-over panel                                                     */}
      {/* ------------------------------------------------------------------ */}
      {selected && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setSelected(null)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 40,
            }}
          />

          {/* Panel */}
          <div
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              height: "100%",
              width: 480,
              backgroundColor: "#0f0f0f",
              borderLeft: "1px solid #1f1f1f",
              overflowY: "auto",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              transition: "transform 0.2s",
              transform: "translateX(0)",
            }}
          >
            {/* Panel header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #1f1f1f",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                flexShrink: 0,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#ededed",
                    marginBottom: 6,
                  }}
                >
                  {selected.name}
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555555",
                  fontSize: 20,
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0,
                  marginTop: 2,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#ededed";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#555555";
                }}
              >
                ×
              </button>
            </div>

            {/* Panel content */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Overview */}
              <Section title="Overview">
                <Row label="Division"  value={DIVISIONS[selected.division]?.name} />
                <Row
                  label="Location"
                  value={
                    selected.city && selected.state
                      ? `${selected.city}, ${selected.state}`
                      : selected.state ?? selected.city ?? null
                  }
                />
                <Row label="Region"    value={DIVISIONS[selected.division]?.region} />
                <Row label="Timezone"  value={DIVISIONS[selected.division]?.timezone} />
              </Section>

              {/* Pricing */}
              <Section title="Pricing">
                <Row
                  label="Price From"
                  value={
                    selected.price_from
                      ? `$${selected.price_from.toLocaleString()}`
                      : "TBD"
                  }
                />
                {selected.price_to && (
                  <Row
                    label="Price To"
                    value={`$${selected.price_to.toLocaleString()}`}
                  />
                )}
                <Row
                  label="HOA"
                  value={
                    selected.hoa_fee
                      ? `$${selected.hoa_fee.toLocaleString()} / ${selected.hoa_period ?? "mo"}`
                      : null
                  }
                />
              </Section>

              {/* Features */}
              <Section title="Features">
                <Row label="Model Home"    value={selected.has_model ? "Yes" : "No"} />
                <Row label="LotWorks"      value={selected.has_lotworks ? "Yes" : "No"} />
                {selected.is_55_plus && (
                  <Row label="55+ Community" value="Yes" />
                )}
              </Section>

              {/* Utilities — only render if at least one field is set */}
              {(selected.natural_gas ||
                selected.electric ||
                selected.water ||
                selected.sewer ||
                selected.cable_internet ||
                selected.trash) && (
                <Section title="Utilities">
                  <Row label="Natural Gas"    value={selected.natural_gas} />
                  <Row label="Electric"       value={selected.electric} />
                  <Row label="Water"          value={selected.water} />
                  <Row label="Sewer"          value={selected.sewer} />
                  <Row label="Cable/Internet" value={selected.cable_internet} />
                  <Row label="Trash"          value={selected.trash} />
                </Section>
              )}

              {/* Amenities */}
              {selected.amenities && (
                <Section title="Amenities">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selected.amenities
                      .split(";")
                      .map((a) => a.trim())
                      .filter(Boolean)
                      .map((a) => (
                        <span
                          key={a}
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 4,
                            backgroundColor: "#161616",
                            border: "1px solid #2a2a2a",
                            color: "#888888",
                          }}
                        >
                          {a}
                        </span>
                      ))}
                  </div>
                </Section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
