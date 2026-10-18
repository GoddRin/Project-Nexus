/**
 * What the Atlas assistant knows about the company itself, its leadership, its verified Project
 * Managers and Division Directors, its equipment fleet, overseas offices, and its subsidiary SCPC.
 *
 * Every line here was verified from Sta. Clara's official public pages, press releases, organization
 * charts, and internal project accomplishment reports:
 *   - https://staclara.com.ph/                      (overview, services, head office)
 *   - https://staclara.com.ph/who-we-are/about-scic/ (history, mission, vision, PCAB AAAA & ISO IMS)
 *   - https://staclara.com.ph/management-team-2/     (board, executive officers, division directors)
 *   - https://staclara.com.ph/wp-content/uploads/2022/10/SCIC-Organization-Chart-1.png & -2.png
 *   - https://staclara.com.ph/wp-json/wp/v2/posts    (44 official SCIC press releases & news articles)
 *   - https://staclara.com.ph/contact/               (Philippine & PNG contact details)
 *   - https://staclarapower.com.ph/                  (Sta. Clara Power Corporation portfolio)
 *   - https://staclaraqatar.com/                     (Middle East / Qatar & Oman operations)
 *   - Tumauini HEPP Monthly Report No. 54 (MAR-54) & Weekly Report No. 235 (WAR-235)
 *
 * Strict verification rule: Nothing may be added here from guesswork. Only verified names, roles,
 * and figures from official SCIC records appear in this profile.
 */
export const COMPANY_PROFILE_AS_OF = "October 2026";

export const COMPANY_PROFILE = `
COMPANY
- Name: Sta. Clara International Corporation (SCIC). One of the leading full-service engineering, procurement, and construction (EPC) and main contracting groups in the Philippines, with international operations in the Middle East and Papua New Guinea, working in renewable energy, power, water, tunnelling, and infrastructure.
- Tagline: "Renew Your Energy" (adopted 2023, succeeding "Building Your Way to the Future").
- Mission: "Sta. Clara International Corporation is your prime partner in nation-building. We will continue to deliver legacy projects with the highest standards of quality and safety."
- Vision: "Be the Philippines' TOP GLOBAL BUILDER."
- Licences & Certifications: PCAB licence category "AAAA" (Quadruple A Platinum, the highest contractor category in the Philippines, requiring at least PHP 1 billion net worth) in General Building and General Engineering; ISO 9001:2015 (Quality Management), ISO 14001:2015 (Environmental Management), and ISO 45001:2018 (Occupational Health & Safety) Integrated Management System (IMS).

HEAD OFFICE & OVERSEAS OFFICES
- Head Office (Central / Main Office): Highway 54 Plaza, 986 EDSA, Wack-Wack, Mandaluyong City 1550, Philippines.
- Telephone: (+632) 8706 5155 to 57. Fax: (+632) 8706 5158. Business development mobile: (+63) 947 893 2201.
- Email: bd@staclara.com.ph (business development and marketing), careers@staclara.com.ph (human resources), purchasing@staclara.com.ph (procurement), accreditation@staclara.com.ph (subcontractor accreditation).
- Equipment Yard: Carmona Equipment Yard (CEY), Carmona, Cavite (managed by the Plants, Equipment & Transport Division).
- Qatar Office (Sta. Clara International Co. W.L.L., established January 16, 2005): Office No. 5, 2nd Floor, Arafat Business Centre, Barwa Tower 2, Al Sadd, C-Ring Road, P.O. Box 23748, Doha, State of Qatar. Tel: (+974) 4467 2785. Email: info@staclaraqatar.com.
- Oman Office (Sta. Clara Oman LLC, established January 2016): P/F Bldg. A399, Way No. 4011, Ghubrah, P.O. Box 1229, PC 130 Al Azaiba, Muscat, Sultanate of Oman. Tel: (+968) 2449 3866.
- Papua New Guinea Office (Sta. Clara International Corporation [PNG] Ltd.): Section 76, Lot 6, Takubar, Kokopo, East New Britain Province, Papua New Guinea. Email: biz@staclara.com.ph.

HISTORY, AWARDS & TRAINING PROGRAMS
- 1976: Founded as a single proprietorship, Sta. Clara Trading and Construction Company (supplying construction materials, heavy equipment rental, and subcontract works including the Philippine Nuclear Power Plant project).
- 1990: Incorporated and registered with the Philippine Securities and Exchange Commission (SEC) as Sta. Clara International Corporation (SCIC).
- 1995: Obtained PCAB licence category "AAA" (General Building / General Engineering).
- 1996: Executed its first major hydroelectric project, the 70 MW Bakun AC Hydro Power Project in Benguet and Ilocos Sur, featuring a 9.6 to 10.5 km tunnel (the longest tunnel in the Philippines at the time).
- 2004: Incorporated subsidiary Sta. Clara Power Corporation (SCPC) for renewable energy development and expanded overseas to the Middle East (Qatar, UAE, Oman).
- November 12, 2015: Launched the SCIC Cadet Engineer Program (CEP) — "Bridge the Gap, Steel the Future" — a 9-month office and site-based rotational training program for newly licensed Civil, Electrical, Mechanical, and Mining Engineers (graduating over 145 cadet engineers across 8 batches by 2022).
- 2016: Invested PHP 350 million in 60+ brand-new heavy and underground machines, including two Ardeo Solutions Model DH-RCM Microtunnel Boring Machines (MTBM, capable of laser-guided non-man-entry tunnelling from 250 mm diameter in up to 200 MPa rock) and Putzmeister Robotic Nozzle Manipulators for underground shotcreting.
- February & March 2016: 8 MW Catuiran HEPP achieved 1 Million Safe Man-Hours; Project Manager Albert B. Mendoza and 29 Catuiran HEPP employees were awarded the SCIC Medal for Heroism for rescuing 29 individuals from flash floods during Typhoon Nona on December 18, 2015.
- 2017: Upgraded to PCAB Quadruple A ("AAAA") Platinum licence and named "PILLAR of the Construction Industry" by the Construction Industry Authority of the Philippines (CIAP); Balingasag 3 x 55 MW Thermal Power Plant achieved 8 Million Safe Man-Hours.
- December 6, 2022: Awarded the DTI Exporters' Night Service Excellence Award for the Construction Services Sector by the Department of Trade and Industry (DTI), EMB, EDC, and PHILEXPORT.
- September 2026: 50th anniversary (Golden Jubilee).

BOARD OF DIRECTORS & EXECUTIVE LEADERSHIP
- Board of Directors: Nicandro G. Linao (Chairman), Irma L. Linao, Oscar L. Batol, Miguel Carlos L. Linao, Asisclo T. Gonzaga, Luis Y. Benitez, Jr., Marianito D. Roque.
- Chairman and Managing Director (Founder & Head of Tendering and Business Development): Nicandro G. Linao.
- Deputy Managing Director (International Business & Administration; Integrated Management Representative): Miguel Carlos L. Linao.
- Deputy Managing Director for Operations and Engineering (also Director for Project Control): Fernando T. Delgado.
- Director for Finance (Chief Financial Officer / CFO): Redentor Dela Torre.
- Director for Finance and Administration (also Integrated Management Representative): Marie Kristine Diaz-Acoymo.
- Chief Legal Counsel: Atty. Roland G. Rosales.

OPERATIONS DIVISION DIRECTORS, GROUP MANAGERS & DEPARTMENT HEADS (PER OFFICIAL SCIC ORG CHART)
- Director for Operations & Director for Hydro Projects: Renin T. Belo.
- Director for Energy Projects: Luisito O. Traboco.
- Director for Infrastructure Projects (also served as Director for Project Control & Technical Services): Antonio S. Pascua.
- Director for Water Projects: Narciso M. Areglado.
- Director for Engineering and Business Development: Carlos P. Hadap.
- Group Manager for Buildings and Industrial Plants: Norman Enriquez.
- Senior Vice President for Special Operations Division: Nobukazu Kotake.
- Technical Support Services Manager (Project Management): Antero Magallon, Jr.
- Quantity Surveying (QS) Manager: Angel Tiamsim.
- Sr. Commercial & Contracts Manager: January Mañalac.
- Project Control Manager: John Rey Cahilig.
- Quality, Environment, Safety & Health (QESH) Group Manager: Thelma G. Mendoza.
- Environment, Safety & Health (ESH) Manager: Larry Payba.
- Quality Assurance / Quality Control (QA/QC) Manager (and Pagudpud Wind Project Manager): Engr. Ryan Flores.
- Group Manager for Tendering: Juanillo Abonal.
- Group Manager for Business Development & Marketing: Pablo G. Mandrilla, Jr.
- Business Development Manager: Ronaldo S. Lacsamana.
- I.T. Manager: Alberto Luis Linao.
- Human Resource Manager: Ronel Cecilia. Human Resource Overseas Group Manager: Rosario F. Arce.
- Administration Manager: Gerardo Malate. Security Manager (Admin Head – Security): Alejandro Antonio.
- Supply Chain Group Manager (also served as AVP for Administration): Reynalyn O. Caudilla.
- Warehouse Manager – North: Nikki Quimlat. Warehouse Manager – South: Ericson Arcilla.
- Accounting Manager: Gelyn Josep. Finance Manager: Oliver J. Brazas. Treasury Manager: Mary Ann Josefina Santos.
- Plants, Equipment & Transport Division (PETD) Group Manager: Michael Vergara.

VERIFIED PROJECT MANAGERS & SITE LEADERSHIP PER PROJECT
1. Tumauini Hydroelectric Power Project (THEPP, 11.3 MW, Antagan Uno, Tumauini, Isabela — Code: SCIC-HEPP-01 / Internal Code: LUZ-21-009):
   - Project Manager (Resident Project Manager): Engr. Romeo Sese.
   - Deputy Project Manager: Nathaniel P. Principe.
   - Project Control Head / Lead Technical & Project Engineering Head: Engr. Noel G. Lavapie.
   - Key Site Engineering & Supervision Team: Zandre Villaver (Mechanical Superintendent), Marvin Sibal (Safety Officer), May Ann Parallag (Planning Engineer), Rovigail Joy Abellar (HR Officer), Angelo Sarmiento (Timekeeper), Elbert Figuracion (AutoCAD Operator), Johnny Farong-Ey (Surveyor), Amor Floresca Jr. (Geological Mapper), Jayson Aggabao (Document Controller).
   - Division Oversight: SCIC Hydropower Projects Division under Director Renin T. Belo.
   - Verified Contract Details: Client is Philnew Hydro Power Corporation (PHPC); Owner's Engineer is EDCOP; Contract Amount is PHP 1,995,967,295.80 (Civil Works: PHP 1,522,954,809.39 / 76.30%); NTP Start Date: April 12, 2022; Revised Completion Date: December 28, 2026 (86.19% overall weighted progress and 534 site personnel as of Weekly Accomplishment Report No. 235, October 9, 2026).
2. Pagudpud Wind Farm (160 MW Balaoi-Caunayan Wind Power Project, Pagudpud, Ilocos Norte — Code: SCIC-WIND-01):
   - Project Manager: Engr. Ryan Flores (verified in SCIC's official press release on the May 26, 2023 presidential commissioning of the 160 MW Pagudpud Wind Farm for ACEN / Bayog Wind Power Corp.).
   - Division Oversight: SCIC Renewable Energy / Wind Power Projects.
3. Catuiran Hydroelectric Power Plant (8 MW, Naujan, Oriental Mindoro — Code: SCIC-HEPP-08):
   - Project Manager: Albert B. Mendoza (verified in SCIC's February 2016 1-Million Safe Man-Hours release and March 2016 SCIC Medal for Heroism award for Catuiran Hydro Power Corporation / SCPC).
   - Division Oversight: SCIC Hydropower Projects Division under Director Renin T. Belo.
4. Balingasag Thermal Power Plant (3 x 55 MW, Balingasag, Misamis Oriental — Code: SCIC-PWR-03):
   - Project Manager: Peter Alan D. Pineda (verified in SCIC's December 2015 Safe Man-Hours press release for client Mitsubishi Corporation / Minergy Coal Corporation).
   - Division Oversight: SCIC Energy Projects Division under Director Luisito O. Traboco.
5. Major Projects with Verified Division Director / Group Manager Leadership Named in Official SCIC Press Releases:
   - Maersk – LF Logistics South Luzon Mega Distribution Hub (10-hectare / 100,000+ sqm facility, Batino, Calamba, Laguna — Code: SCIC-LOG-MAERSK): Led for SCIC by Group Manager for Buildings and Industrial Plants Norman Enriquez with Chairman & MD Nicandro G. Linao (client: Precos, Inc. / Solid Group Inc. for Maersk).
   - PMFTC Batangas Factory Extension Project (FPIP, Tanauan, Batangas — Code: SCIC-IND-PMFTC): Led for SCIC by Group Manager for Buildings and Industrial Plants Norman Enriquez, Director for Business Development & Engineering Carlos P. Hadap, Director for Project Control & Technical Services Antonio S. Pascua, and Group Manager Pablo G. Mandrilla, Jr.
   - Davao City Bulk Water Supply Project WTP (300+ MLD, Tamugan River, Davao City — Code: SCIC-WTP-03): Led for SCIC by Director for Water Projects Narciso M. Areglado with Chairman & MD Nicandro G. Linao (client: Apo Agua Infrastructura, Inc.).
   - Maladugao River (Upper Cascade) Hydroelectric Power Project (8.4 MW, Kalilangan, Bukidnon — Code: SCIC-HEPP-11): Led for SCIC by Director for Hydropower Projects Renin T. Belo and Deputy Managing Director for Operations Fernando T. Delgado (client: Investco BHPI Inc.).
   - Masinloc Battery Energy Storage System (10 MW BESS, Masinloc, Zambales — Code: SCIC-BESS-02, first grid-scale BESS in Southeast Asia): Led for SCIC by Senior Vice President for Special Operations Division Nobukazu Kotake (client: AES Philippines / Masinloc Power Partners Co. Ltd.).
   - Bohol PRDP Desamparados-Tabuan Farm-to-Market Road and Four Bridges (12.656 km, PHP 625M World Bank PRDP contract, Calape to Antequera, Bohol — Code: SCIC-INFRA-BOHOL-PRDP): Led at groundbreaking by Deputy Managing Director Miguel Carlos L. Linao under the SCIC Infrastructure Projects Division (Director Antonio S. Pascua).
6. Division Oversight for Other SCIC Projects:
   - For projects where SCIC has not publicly listed an individual site-level Resident Project Manager, execution is overseen by the respective SCIC Division Director or Group Manager:
     * Hydropower Projects: Renin T. Belo (Director for Operations & Director for Hydro Projects)
     * Energy, Thermal, Solar, Wind & Grid Projects: Luisito O. Traboco (Director for Energy Projects)
     * Water Supply, Bulk Water, Sewage & Flood Control Projects: Narciso M. Areglado (Director for Water Projects)
     * Roads, Highways, Expressways, Bridges & Railways: Antonio S. Pascua (Director for Infrastructure Projects)
     * Commercial Buildings, Warehouses & Industrial Plants: Norman Enriquez (Group Manager for Buildings and Industrial Plants)
     * Tunnelling, Mining & Overall Operations / Project Control: Fernando T. Delgado (Deputy Managing Director for Operations and Engineering & Director for Project Control)

WHAT THE COMPANY DOES & HEAVY EQUIPMENT FLEET
- Civil works: site development, roads, railways, bridges, dams, irrigation, reservoirs, flood control, ports and harbours.
- Building works: commercial buildings, mega distribution warehouses, industrial plants, communication and monitoring facilities.
- Plant works: water treatment, sewerage, and power generation (hydro, wind, solar, thermal, diesel) and battery energy storage systems (BESS).
- Tunnelling and underground works: mining, drill-and-blast rock tunnelling, microtunnel boring (MTBM), pipe jacking, horizontal directional drilling (HDD).
- Foundation works: bored piling, pile driving, secant and tangent piles, micropiling, vibro-replacement stone columns, soil-cement columns.
- Major Equipment Fleet (managed by PETD Group Manager Michael Vergara at Carmona Equipment Yard): Crawler, rough-terrain, and tower cranes up to 200 tons; Sandvik, Atlas Copco, and Aramine underground jumbo drills and LHD muckers; Rasa DH-RCM 1800 pipe-jacking and Ardeo Solutions Microtunnel Boring Machines (MTBM); Putzmeister robotic shotcrete manipulators; Liebherr, Mait, and Sany bored piling rigs; Elkon and Eurotec concrete batching plants.

SUBSIDIARY — STA. CLARA POWER CORPORATION (SCPC)
- Established 2004: Philippine renewable energy developer and IPP that develops, owns, and operates run-of-river hydroelectric power plants under DOE service contracts and is expanding into wind and solar.
- Office: 2F Highway 54 Plaza, 986 Stanford Street corner EDSA, Mandaluyong City 1550. Tel: (+632) 234-9733. Email: info@staclarapower.com / hr@staclarapower.com.
- SCPC Operating Hydropower Plants (4 plants, 11.3 MW total):
  1. Loboc 1 HEPP (1.2 MW, Brgy. Gotozon, Loboc, Bohol — operating since July 2005)
  2. Amlan HEPP (0.9 MW, Amlan, Negros Oriental — operating since 2009)
  3. Catuiran HEPP (8.0 MW, Naujan, Oriental Mindoro — operating since December 2018)
  4. Loboc 2 HEPP (1.2 MW, Loboc, Bohol — operating since December 2019)
- SCPC Hydropower Projects in Development (6 plants, 48.54 MW total):
  1. Tumauini (Lower Cascade) HEPP (13.56 MW, Tumauini, Isabela — est. 29,244 tCO2/yr reduction)
  2. Mangima HEPP (12.0 MW, Manolo Fortich, Bukidnon — est. 40,463 tCO2/yr reduction)
  3. Clarin HEPP (8.28 MW, Clarin, Misamis Occidental — est. 19,474 tCO2/yr reduction)
  4. Mat-i 1 HEPP (5.82 MW, Claveria, Misamis Oriental — est. 14,622 tCO2/yr reduction)
  5. Malitbog HEPP (4.44 MW, Malitbog, Bukidnon — est. 13,473 tCO2/yr reduction)
  6. Silo-o HEPP (4.44 MW, Malitbog, Bukidnon — est. 13,274 tCO2/yr reduction)
`.trim();
