
const axios = require('axios');
require('dotenv').config();
const iata = require('./data');

const BASE_URL = process.env.BASE_URL;
const DEPARTURE_DATE_START = '2023-09-30';
const DEPARTURE_DATE_END = '2023-10-16';
const BUDGET = 400;

let ACCESS_TOKEN = '';

const getNextDate = (date) => {
  // format date to YYYY-MM-DD
  const [year, month, day] = date.split('-');

  const nextDate = new Date(year, month - 1, day);
  nextDate.setDate(nextDate.getDate() + 1);

  const nextYear = nextDate.getFullYear();
  const nextMonth = `${(nextDate.getMonth() + 1).toString().padStart(2, '0')}`;
  const nextDay = `${nextDate.getDate().toString().padStart(2, '0')}`;

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

const getAccessToken = async () => {
  const accessTokenResponse = await axios.post(`${BASE_URL}/v1/security/oauth2/token`, {
    grant_type: 'client_credentials',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
  }, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  return accessTokenResponse.data.access_token
}

const findNewIataCodesToCity = async (iataCode) => {
  const city = await axios.get(`${BASE_URL}/v1/reference-data/locations`, {
    params: {
      keyword: iataCode,
      subType: 'AIRPORT'
    },
    headers: {
      ContentType: 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${ACCESS_TOKEN}`
    }
  })
  console.log('NEW NAME', city.data.data[0].address.cityName);
  // return city.data.data[0].detailedName
}

const getFlightsUnderBudget = (flights) => {
  return flights.filter(flight => Number(flight.price.grandTotal) <= BUDGET);
}

const formatSegment = (segment) => {
  return {
    departure: {
      name: iata[segment.departure.iataCode]
        || (findNewIataCodesToCity(segment.departure.iataCode) && segment.departure.iataCode),
      at: segment.departure.at,
    },
    arrival: {
      name: iata[segment.arrival.iataCode]
        || (findNewIataCodesToCity(segment.arrival.iataCode) && segment.arrival.iataCode),
      at: segment.arrival.at,
    },
  }
}

const formatItinerary = (itineraries) => {
  if (itineraries.length > 1) {
    console.log('multiple itineraries');
  }
  // duration format is PT2H30M, to convert to hours:minutes
  const duration = itineraries[0].duration.split('T')[1].replace('H', 'h').replace('M', '');


  return {
    duration,
    stops: itineraries[0].segments.length - 1,
    steps: itineraries[0].segments.map(segment => formatSegment(segment)),
    // all cities like CDG -> IST -> CNX
    stepsCities: itineraries[0].segments.reduce((acc, segment) => {
      if (!acc.length) {
        acc.push(iata[segment.departure.iataCode] || segment.departure.iataCode);
      }
      acc.push(iata[segment.arrival.iataCode] || segment.arrival.iataCode);
      return acc;
    }, []).join(' -> '),
  }
}


const checkFlightsForSpecificOptions = async (origin, destination, departureDate) => {
  const params = {
    originLocationCode: origin,
    destinationLocationCode: destination,
    departureDate,
    adults: 1,
    nonStop: false,
    currencyCode: 'EUR',
    max: 5,
  }

  const flightOffers = await axios.get(`${BASE_URL}/v2/shopping/flight-offers`, {
    params,
    headers: {
      ContentType: 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${ACCESS_TOKEN}`
    }
  })

  return flightOffers.data.data
  // console.log('flightOffersData:', flightOffersData);
}

const launchScript = async () => {
  ACCESS_TOKEN = await getAccessToken()
  // wait 200ms before next request
  await new Promise(resolve => setTimeout(resolve, 200));

  // for the date range: 2023-09-28 to 2023-10-14
  // for each day, check flights from PAR to CNX
  let date = DEPARTURE_DATE_START;
  do {
    console.log('date', date);
    const flights = await checkFlightsForSpecificOptions('PAR', 'CNX', DEPARTURE_DATE_START);
    const flightsOnBudget = getFlightsUnderBudget(flights);
    if (!flightsOnBudget.length) {
      date = getNextDate(date);
      await new Promise(resolve => setTimeout(resolve, 200));
      continue;
    }
    for (const flight of flightsOnBudget) {
      console.log('date', date)
      console.log('price', flight.price.grandTotal);
      console.log(formatItinerary(flight.itineraries));
      console.log('-------------------', '\n');
    }
    date = getNextDate(date);

    // wait 200ms before next request
    await new Promise(resolve => setTimeout(resolve, 200));
  } while (date !== DEPARTURE_DATE_END)

  console.log('end');
  process.exit();
}

launchScript();