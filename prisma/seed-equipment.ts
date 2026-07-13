import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { EquipmentCategory, EquipmentStatus, EquipmentCondition } from "@prisma/client";

async function main() {
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) throw new Error("Project 'tumauini-hepp' not found. Run network/sitemap seeds first.");

  const adminUser = await prisma.user.findFirst();
  if (!adminUser) throw new Error("No user found in database to associate with equipment creation.");

  // Fetch locations to map SiteLocationId
  const locations = await prisma.siteLocation.findMany({
    where: { projectId: project.id },
  });

  const getLocId = (slug: string) => locations.find((l) => l.slug === slug)?.id || null;

  const equipmentData = [
    {
      equipmentTag: "TU-01",
      name: "Francis Turbine Unit 1",
      category: EquipmentCategory.TURBINE,
      manufacturer: "ANDRITZ Hydro",
      model: "FR-V-1250",
      serialNumber: "AND-2025-FT01",
      installationDate: new Date("2025-05-15"),
      commissionDate: new Date("2025-10-10"),
      location: "Powerhouse Main Bay (Unit 1)",
      siteLocationId: getLocId("powerhouse"),
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.EXCELLENT,
      specifications: {
        "Rated Power": "5.65 MW",
        "Rated Head": "45 m",
        "Rated Flow": "14.2 m³/s",
        "Runner Diameter": "1250 mm",
        "Rated Speed": "600 rpm",
        "Specific Speed": "220 m-kW",
        "Efficiency at Rated": "92.5%",
      },
    },
    {
      equipmentTag: "GEN-01",
      name: "Synchronous Generator Unit 1",
      category: EquipmentCategory.GENERATOR,
      manufacturer: "ANDRITZ Hydro",
      model: "SG-V-6250",
      serialNumber: "AND-2025-GEN01",
      installationDate: new Date("2025-06-20"),
      commissionDate: new Date("2025-10-10"),
      location: "Powerhouse Generator Floor (Unit 1)",
      siteLocationId: getLocId("powerhouse"),
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.GOOD,
      specifications: {
        "Rated Capacity": "6.25 MVA",
        "Rated Power": "5.0 MW",
        "Rated Voltage": "6.3 kV",
        "Frequency": "60 Hz",
        "Power Factor": "0.8",
        "Excitation Voltage": "125 VDC",
        "Cooling Method": "IC 01 - Open Air",
      },
    },
    {
      equipmentTag: "TR-GSU-01",
      name: "Generator Step-Up Transformer",
      category: EquipmentCategory.TRANSFORMER,
      manufacturer: "Hyundai Heavy Industries",
      model: "GSU-12.5M",
      serialNumber: "HHI-2025-TR01",
      installationDate: new Date("2025-08-01"),
      commissionDate: new Date("2025-10-15"),
      location: "Outdoor Switchyard Transformer Bay 1",
      siteLocationId: getLocId("switchyard"),
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.GOOD,
      specifications: {
        "Rated Capacity": "12.5 MVA",
        "Primary Voltage": "6.3 kV",
        "Secondary Voltage": "69 kV",
        "Cooling Type": "ONAF",
        "Vector Group": "YNd1",
        "Impedance": "7.5%",
        "Total Oil Weight": "12,500 kg",
      },
    },
    {
      equipmentTag: "GOV-01",
      name: "Digital Governor Unit 1",
      category: EquipmentCategory.GOVERNOR,
      manufacturer: "Voith Hydro",
      model: "HydroGyn-PLC",
      serialNumber: "VH-2025-GOV01",
      installationDate: new Date("2025-07-10"),
      commissionDate: new Date("2025-10-10"),
      location: "Powerhouse Control Room Level",
      siteLocationId: getLocId("powerhouse"),
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.EXCELLENT,
      specifications: {
        "Governor Type": "Electro-hydraulic",
        "Operating Pressure": "6.3 MPa",
        "Control System": "Siemens S7-1500 PLC",
        "Accumulator Volume": "500 L",
        "Main Servomotor Stroke": "320 mm",
        "Oil Grade": "ISO VG 46",
      },
    },
    {
      equipmentTag: "REL-01",
      name: "Generator Protection Relay Panel",
      category: EquipmentCategory.PROTECTION_RELAY,
      manufacturer: "Schweitzer Engineering Laboratories",
      model: "SEL-700G",
      serialNumber: "SEL-2025-REL01",
      installationDate: new Date("2025-07-22"),
      commissionDate: new Date("2025-10-05"),
      location: "Powerhouse Control & Relay Room",
      siteLocationId: getLocId("powerhouse"),
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.GOOD,
      specifications: {
        "Model": "SEL-700G1",
        "Protocols": "IEC 61850, Modbus TCP, DNP3",
        "Functions": "59G (Overvoltage), 27 (Undervoltage), 87G (Differential), 40 (Loss of Field)",
        "Supply Voltage": "110 VDC",
        "Communication Interface": "Redundant Fiber Optic Ethernet",
      },
    },
    {
      equipmentTag: "DG-01",
      name: "Standby Diesel Generator",
      category: EquipmentCategory.DIESEL_GENERATOR,
      manufacturer: "Caterpillar",
      model: "CAT C15",
      serialNumber: "CAT-2025-DG01",
      installationDate: new Date("2025-04-18"),
      commissionDate: new Date("2025-09-01"),
      location: "DG Building (Powerhouse West)",
      siteLocationId: getLocId("powerhouse"),
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.EXCELLENT,
      specifications: {
        "Prime Rating": "500 kVA",
        "Standby Rating": "550 kVA",
        "Voltage": "480 V",
        "Frequency": "60 Hz",
        "Fuel Capacity": "1000 L",
        "Fuel Type": "Diesel (EN 590)",
        "Engine RPM": "1800 rpm",
      },
    },
    {
      equipmentTag: "CR-01",
      name: "Overhead Crane (Powerhouse)",
      category: EquipmentCategory.CRANE_HOIST,
      manufacturer: "Konecranes",
      model: "CXT-Double-30T",
      serialNumber: "KC-2025-CR01",
      installationDate: new Date("2025-02-10"),
      commissionDate: new Date("2025-03-01"),
      location: "Powerhouse Crane Rails",
      siteLocationId: getLocId("powerhouse"),
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.GOOD,
      specifications: {
        "Main Hoist Capacity": "30 Tons",
        "Auxiliary Hoist": "5 Tons",
        "Span": "16.5 m",
        "Lifting Height": "12 m",
        "Travel Speed": "20 m/min",
        "Class": "CMAA Class D Heavy Duty",
      },
    },
    {
      equipmentTag: "SCADA-01",
      name: "SCADA Master Station",
      category: EquipmentCategory.SCADA_PLC,
      manufacturer: "GE Digital",
      model: "iFIX-Nexus-6.5",
      serialNumber: "GE-SCADA-01",
      installationDate: new Date("2025-09-01"),
      commissionDate: new Date("2025-10-20"),
      location: "Powerhouse Server Room (linked to SRV-SCADA-01)",
      siteLocationId: getLocId("powerhouse"),
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.GOOD,
      specifications: {
        "Software": "iFIX 6.5 Proficy",
        "OS": "Windows Server 2022",
        "Hardware Platform": "SRV-SCADA-01 / SRV-SCADA-02 (Redundant Rack)",
        "Communication Protocols": "DNP3, IEC 60870-5-104, Modbus TCP, OPC UA",
        "Max Tags": "50,000 Tags licensed",
        "HMI Clients": "3 Operator Stations",
      },
    },
  ];

  for (const eq of equipmentData) {
    await prisma.plantEquipment.upsert({
      where: { id: `seed-eq-${eq.equipmentTag.toLowerCase()}` },
      update: {
        name: eq.name,
        category: eq.category,
        manufacturer: eq.manufacturer,
        model: eq.model,
        serialNumber: eq.serialNumber,
        installationDate: eq.installationDate,
        commissionDate: eq.commissionDate,
        location: eq.location,
        siteLocationId: eq.siteLocationId,
        status: eq.status,
        condition: eq.condition,
        specifications: eq.specifications,
      },
      create: {
        id: `seed-eq-${eq.equipmentTag.toLowerCase()}`,
        projectId: project.id,
        equipmentTag: eq.equipmentTag,
        name: eq.name,
        category: eq.category,
        manufacturer: eq.manufacturer,
        model: eq.model,
        serialNumber: eq.serialNumber,
        installationDate: eq.installationDate,
        commissionDate: eq.commissionDate,
        location: eq.location,
        siteLocationId: eq.siteLocationId,
        status: eq.status,
        condition: eq.condition,
        specifications: eq.specifications,
        createdById: adminUser.id,
      },
    });
  }

  console.log("Upserted 8 Tumauini HEPP plant equipment records successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
