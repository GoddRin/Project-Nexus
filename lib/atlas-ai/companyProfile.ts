/**
 * What the Atlas assistant knows about the company itself (as opposed to its projects, which come
 * from the Project Atlas database).
 *
 * Every line here was taken from Sta. Clara's own public pages and checked on 2026-10-02:
 *   - https://staclara.com.ph/                      (overview, services, head office)
 *   - https://staclara.com.ph/who-we-are/about-scic/ (history, mission, vision, licence)
 *   - https://staclara.com.ph/management-team-2/     (board and officers)
 *   - https://staclara.com.ph/contact/               (address, phone, email)
 *   - https://staclarapower.com.ph/                  (Sta. Clara Power Corporation)
 * People and titles change: when the company updates those pages, update this file. Nothing may
 * be added here from memory or guesswork; the assistant treats this text as verified fact.
 */
export const COMPANY_PROFILE_AS_OF = "October 2026";

export const COMPANY_PROFILE = `
COMPANY
- Name: Sta. Clara International Corporation (SCIC). One of the leading engineering and main contracting groups in the Philippines, with a strong presence in the Middle East, working in power, infrastructure and civil engineering.
- Mission: "Sta. Clara International Corporation is your prime partner in nation-building. We will continue to deliver legacy projects with the highest standards of quality and safety."
- Vision: "Be the Philippines' TOP GLOBAL BUILDER."

HEAD OFFICE (the central / main office)
- Highway 54 Plaza, 986 EDSA, Wack-Wack, Mandaluyong City 1550, Philippines.
- Telephone: (+632) 8706 5155 to 57. Fax: (+632) 8706 5158. Business development mobile: (+63) 947 893 2201.
- Email: bd@staclara.com.ph (business development and marketing), careers@staclara.com.ph (human resources), purchasing@staclara.com.ph (procurement), accreditation@staclara.com.ph (subcontractor accreditation).
- The company website does not list office hours or any branch or overseas office addresses.

HISTORY
- 1976: founded as a single proprietorship, Sta. Clara Trading and Construction Company.
- 1990: incorporated and registered with the Securities and Exchange Commission as Sta. Clara International Corporation.
- 1995: obtained PCAB licence category "AAA" (General Building / General Engineering).
- 1996: first major hydro project, the Bakun Hydro Power Project in Benguet, with a 9.6 km tunnel.
- 2004: established its subsidiary Sta. Clara Power Corporation (SCPC) for hydroelectric operations.
- 2017: upgraded to PCAB licence category "AAAA", the highest contractor category.
- 2021: 45 years in service. 2023: DTI Service Excellence awardee for the construction sector.
- September 2026: 50th year, the company's Golden Jubilee.

LEADERSHIP
- Chairman and Managing Director: Nicandro G. Linao.
- Deputy Managing Director (also Director for Administration and Integrated Management Representative): Miguel Carlos L. Linao.
- Deputy Managing Director for Operations (also Director for Project Control): Fernando T. Delgado.
- Director for Finance (CFO): Redentor Dela Torre.
- Director for Engineering and Business Development: Carlos P. Hadap.
- Director for Water Projects: Narciso M. Areglado. Director for Infrastructure Projects: Antonio S. Pascua.
- Director for Hydro Projects (also Director for Operations): Renin T. Belo. Director for Energy Projects: Luisito O. Traboco.
- Director for Finance and Administration: Marie Kristine Diaz-Acoymo. Chief Legal Counsel: Atty. Roland Rosales.
- Board of Directors: Nicandro G. Linao (Chairman), Irma L. Linao, Oscar L. Batol, Miguel Carlos L. Linao, Asisclo T. Gonzaga, Luis Y. Benitez, Jr., Marianito D. Roque.
- The company's public pages do not name a founder and do not use the title "President" or "CEO"; the head of the company is the Chairman and Managing Director.

WHAT THE COMPANY DOES
- Civil works: site development, roads, railways, bridges, dams, irrigation, reservoirs, flood control, ports and harbours.
- Building works: commercial buildings, industrial plants, communication and monitoring facilities.
- Plant works: water treatment, sewerage, and power generation (hydro, wind, solar, thermal, diesel) and battery storage.
- Tunnelling and underground works: mining, tunnelling, horizontal directional drilling.
- Foundation works: bored piling, pile driving, secant and tangent piles, micropiling, soil-cement columns.

SUBSIDIARY
- Sta. Clara Power Corporation (SCPC), established 2004: a Philippine renewable energy company that develops, owns and operates hydroelectric plants and is expanding into wind and solar. Office: 2F Highway 54 Plaza, 986 Stanford Street corner EDSA, Mandaluyong City 1550.
- SCPC operating plants: Amlan, Catuiran, Loboc 1 and Loboc 2 hydroelectric power plants. In development: Mangima, Tumauini, Clarin and Mat-i 1 hydroelectric power plants.
`.trim();
