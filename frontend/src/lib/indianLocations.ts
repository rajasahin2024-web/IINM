/**
 * Indian States + Union Territories with major cities.
 * Used by the SlotBookingDrawer Location step for cascading State → City dropdowns.
 */
export const INDIAN_STATES_CITIES: Record<string, string[]> = {
  // ── States (28) ──
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Kakinada", "Anantapur", "Ongole", "Eluru"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro", "Tezu", "Bomdila", "Seppa"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon", "Karimganj", "Dhubri"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Arrah", "Begusarai", "Chhapra", "Katihar"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon", "Jagdalpur", "Raigarh", "Ambikapur", "Mahasamund"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim", "Porvorim", "Madgaon"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Nadiad", "Mehsana", "Bharuch", "Navsari", "Morbi"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Rohtak", "Hisar", "Sonipat", "Panchkula", "Yamunanagar", "Kurukshetra", "Kaithal"],
  "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala", "Solan", "Mandi", "Kullu", "Chamba", "Una", "Hamirpur", "Bilaspur"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh", "Deoghar", "Giridih", "Ramgarh", "Phusro", "Chas"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubli", "Mangaluru", "Belagavi", "Davanagere", "Ballari", "Kalaburagi", "Vijayapura", "Shivamogga", "Tumakuru", "Udupi", "Hassan", "Mandya"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha", "Palakkad", "Kottayam", "Malappuram", "Pathanamthitta", "Kasaragod"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Ratlam", "Satna", "Rewa", "Dewas", "Katni", "Chhindwara", "Burhanpur"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Thane", "Navi Mumbai", "Solapur", "Kolhapur", "Amravati", "Nanded", "Jalgaon", "Akola", "Latur", "Chandrapur", "Bhiwandi"],
  "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Ukhrul", "Senapati", "Churachandpur", "Chandel", "Tamenglong"],
  "Meghalaya": ["Shillong", "Tura", "Nongstoin", "Jowai", "Williamnagar", "Baghmara", "Resubelpara", "Mairang"],
  "Mizoram": ["Aizawl", "Lunglei", "Saiha", "Champhai", "Kolasib", "Serchhip", "Mamit", "Lawngtlai"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Zunheboto", "Mon", "Phek"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Brahmapur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda", "Bargarh"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Firozpur", "Sangrur", "Barnala", "Moga", "Phagwara"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Bharatpur", "Sikar", "Pali", "Sri Ganganagar", "Bhilwara", "Chittorgarh", "Banswara"],
  "Sikkim": ["Gangtok", "Namchi", "Mangan", "Gyalshing", "Rangpo", "Singtam", "Soreng", "Pelling"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Vellore", "Thoothukudi", "Dindigul", "Thanjavur", "Erode", "Kanyakumari", "Cuddalore", "Nagercoil"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Mahbubnagar", "Nalgonda", "Siddipet", "Suryapet", "Miryalaguda", "Adilabad"],
  "Tripura": ["Agartala", "Dharmanagar", "Udaipur", "Kailashahar", "Belonia", "Khowai", "Ambassa", "Teliamura"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Ghaziabad", "Noida", "Meerut", "Allahabad", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Firozabad", "Jhansi", "Mathura", "Budaun", "Rampur"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Nainital", "Mussoorie", "Pithoragarh", "Almora", "Rishikesh"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Malda", "Kharagpur", "Darjeeling", "Baharampur", "Krishnanagar", "Naihati", "Bhatpara", "Medinipur"],

  // ── Union Territories (8) ──
  "Andaman and Nicobar Islands": ["Port Blair", "Car Nicobar", "Mayabunder", "Diglipur", "Havelock Island"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa", "Vapi"],
  "Delhi": ["New Delhi", "Central Delhi", "South Delhi", "North Delhi", "East Delhi", "West Delhi", "Dwarka", "Rohini", "Pitampura", "Janakpuri", "Saket", "Vasant Kunj", "Karol Bagh", "Lajpat Nagar"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Kathua", "Udhampur", "Pulwama", "Kulgam", "Bandipora", "Kupwara"],
  "Ladakh": ["Leh", "Kargil", "Nubra", "Zanskar"],
  "Lakshadweep": ["Kavaratti", "Agatti", "Minicoy", "Andrott", "Amini"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"],
};

/** Sorted list of all state + UT names for the State dropdown. */
export const INDIAN_STATE_NAMES: string[] = Object.keys(INDIAN_STATES_CITIES).sort();

/**
 * Get cities for a given state. Returns empty array if state not found.
 */
export function getCitiesForState(stateName: string): string[] {
  return INDIAN_STATES_CITIES[stateName] || [];
}

/**
 * Check if a city exists in the JSON list for a given state.
 */
export function isCityInStateList(stateName: string, cityName: string): boolean {
  const cities = getCitiesForState(stateName);
  return cities.some(c => c.toLowerCase() === cityName.toLowerCase());
}
