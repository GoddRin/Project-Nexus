import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { EquipmentCategory, EquipmentStatus, EquipmentCondition, EquipmentZone } from "@prisma/client";

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

  // 1. Clean up any stale or duplicate equipment records to ensure 100% data integrity
  console.log("Cleaning up existing plant equipment records for project tumauini-hepp...");
  await prisma.equipmentMaintenanceLog.deleteMany({
    where: { equipment: { projectId: project.id } },
  });
  await prisma.equipmentDocument.deleteMany({
    where: { equipment: { projectId: project.id } },
  });
  await prisma.documentChunk.deleteMany({
    where: { projectId: project.id, sourceType: "EQUIPMENT_SPEC" },
  });
  await prisma.plantEquipment.deleteMany({
    where: { projectId: project.id },
  });

  // 2. Define canonical 8 equipment records matching 3D Digital Twin spatial layout & status rules
  const equipmentData = [
    {
      id: "eq-tu-01",
      equipmentTag: "TU-01",
      name: "Francis Turbine Unit 1 (5.65 MW)",
      category: EquipmentCategory.TURBINE,
      manufacturer: "ANDRITZ Hydro",
      model: "FR-V-1250",
      serialNumber: "AND-2025-FT01",
      installationDate: new Date("2025-05-15"),
      commissionDate: new Date("2025-10-10"),
      location: "Powerhouse Main Bay (Unit 1)",
      siteLocationId: getLocId("powerhouse"),
      zone: EquipmentZone.TURBINE_HALL,
      positionX: 52,
      positionY: 60,
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
      id: "eq-gen-01",
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
      zone: EquipmentZone.TURBINE_HALL,
      positionX: 50,
      positionY: 58,
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.GOOD,
      specifications: {
        "Rated Capacity": "6.25 MVA",
        "Rated Power": "5.0 MW",
        "Rated Voltage": "6.3 kV",
        "Frequency": "60 Hz",
        "Power Factor": "0.8",
        "Excitation Voltage": "125 VDC",
      },
    },
    {
      id: "eq-tr-gsu-01",
      equipmentTag: "TR-GSU-01",
      name: "Main GSU Step-Up Transformer (15 MVA)",
      category: EquipmentCategory.TRANSFORMER,
      manufacturer: "Hyundai Heavy Industries",
      model: "GSU-12.5M",
      serialNumber: "HHI-2025-TR01",
      installationDate: new Date("2025-08-01"),
      commissionDate: new Date("2025-10-15"),
      location: "Outdoor Switchyard Transformer Bay 1",
      siteLocationId: getLocId("switchyard"),
      zone: EquipmentZone.SWITCHYARD,
      positionX: 72,
      positionY: 68,
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.EXCELLENT,
      specifications: {
        "Rated Capacity": "15.0 MVA",
        "Primary Voltage": "6.3 kV",
        "Secondary Voltage": "69 kV",
        "Cooling Type": "ONAF",
        "Vector Group": "YNd1",
        "Total Oil Weight": "12,500 kg",
      },
    },
    {
      id: "eq-cb-69kv-01",
      equipmentTag: "CB-69KV-01",
      name: "69kV SF6 Gas Circuit Breaker",
      category: EquipmentCategory.CIRCUIT_BREAKER,
      manufacturer: "Schneider Electric",
      model: "SF6-69K",
      serialNumber: "SE-SF6-69-882",
      installationDate: new Date("2025-08-15"),
      commissionDate: null,
      location: "Outdoor Switchyard Feeder 1",
      siteLocationId: getLocId("switchyard"),
      zone: EquipmentZone.SWITCHYARD,
      positionX: 76,
      positionY: 72,
      status: EquipmentStatus.UNDER_MAINTENANCE,
      condition: EquipmentCondition.FAIR,
      specifications: {
        "Rated Voltage": "69 kV",
        "Rated Current": "1200 A",
        "Interrupting Rating": "25 kA",
        "SF6 Pressure": "0.60 MPa",
      },
    },
    {
      id: "eq-ds-69kv-01",
      equipmentTag: "DS-69KV-01",
      name: "69kV Motorized Disconnect & Grounding Switch",
      category: EquipmentCategory.CIRCUIT_BREAKER,
      manufacturer: "ABB / Hitachi Energy",
      model: "SDF-69K",
      serialNumber: "ABB-DS-2025-04",
      installationDate: new Date("2025-08-10"),
      commissionDate: new Date("2025-10-12"),
      location: "Outdoor Switchyard Bus Bay 1",
      siteLocationId: getLocId("switchyard"),
      zone: EquipmentZone.SWITCHYARD,
      positionX: 74,
      positionY: 70,
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.EXCELLENT,
      specifications: {
        "Rated Voltage": "69 kV",
        "Continuous Current": "1200 A",
        "Operation": "Motorized Gang",
      },
    },
    {
      id: "eq-la-69kv-01",
      equipmentTag: "LA-69KV-01",
      name: "69kV Surge Arrester & PT/CT Metering Set",
      category: EquipmentCategory.PROTECTION_RELAY,
      manufacturer: "Siemens Energy",
      model: "3EK4-69K",
      serialNumber: "SIE-LA-2025-09",
      installationDate: new Date("2025-08-12"),
      commissionDate: new Date("2025-10-14"),
      location: "Outdoor Switchyard Line Entry Bay",
      siteLocationId: getLocId("switchyard"),
      zone: EquipmentZone.SWITCHYARD,
      positionX: 78,
      positionY: 74,
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.EXCELLENT,
      specifications: {
        "MCOV": "54 kV",
        "Discharge Class": "Class 3",
        "PT Ratio": "69kV / 110V",
      },
    },
    {
      id: "eq-gov-01",
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
      zone: EquipmentZone.TURBINE_HALL,
      positionX: 48,
      positionY: 55,
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.EXCELLENT,
      specifications: {
        "Governor Type": "Electro-hydraulic",
        "Operating Pressure": "6.3 MPa",
        "Control System": "Siemens S7-1500 PLC",
      },
    },
    {
      id: "eq-int-gate-01",
      equipmentTag: "INT-GATE-01",
      name: "Main Intake Radial Gate",
      category: EquipmentCategory.GATE_VALVE,
      manufacturer: "DSD Noell",
      model: "RAD-GATE-4X4",
      serialNumber: "DSD-2025-G01",
      installationDate: new Date("2025-04-10"),
      commissionDate: null,
      location: "Upper Dam Intake Structure",
      siteLocationId: getLocId("intake"),
      zone: EquipmentZone.INTAKE,
      positionX: 20,
      positionY: 25,
      status: EquipmentStatus.INSTALLED,
      condition: EquipmentCondition.GOOD,
      specifications: {
        "Gate Dimensions": "4.0 m x 4.0 m",
        "Design Head": "15 m",
        "Hoist Capacity": "25 Tons",
      },
    },
    {
      id: "eq-pen-valve-01",
      equipmentTag: "PEN-VALVE-01",
      name: "Penstock Butterfly Valve",
      category: EquipmentCategory.GATE_VALVE,
      manufacturer: "VAG Group",
      model: "BFV-2200-PN10",
      serialNumber: "VAG-2025-PV01",
      installationDate: new Date("2025-05-01"),
      commissionDate: null,
      location: "Penstock Intake Chamber",
      siteLocationId: getLocId("penstock"),
      zone: EquipmentZone.PENSTOCK,
      positionX: 35,
      positionY: 40,
      status: EquipmentStatus.INSTALLED,
      condition: EquipmentCondition.GOOD,
      specifications: {
        "Nominal Diameter": "2200 mm",
        "Pressure Rating": "PN10 (1.0 MPa)",
        "Actuation": "Hydraulic counterweight drop",
      },
    },
    {
      id: "eq-scada-01",
      equipmentTag: "SCADA-01",
      name: "SCADA Master Control Station",
      category: EquipmentCategory.SCADA_PLC,
      manufacturer: "GE Digital",
      model: "iFIX-Nexus-6.5",
      serialNumber: "GE-SCADA-01",
      installationDate: new Date("2025-09-01"),
      commissionDate: new Date("2025-10-20"),
      location: "Powerhouse Server Room",
      siteLocationId: getLocId("powerhouse"),
      zone: EquipmentZone.TURBINE_HALL,
      positionX: 45,
      positionY: 52,
      status: EquipmentStatus.COMMISSIONED,
      condition: EquipmentCondition.GOOD,
      specifications: {
        "Software": "iFIX 6.5 Proficy",
        "OS": "Windows Server 2022",
        "Max Tags": "50,000 Tags licensed",
      },
    },
  ];

  for (const eq of equipmentData) {
    const record = await prisma.plantEquipment.create({
      data: {
        id: eq.id,
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
        zone: eq.zone,
        positionX: eq.positionX,
        positionY: eq.positionY,
        status: eq.status,
        condition: eq.condition,
        specifications: eq.specifications,
        createdById: adminUser.id,
      },
    });

    if (eq.equipmentTag === "CB-69KV-01") {
      await prisma.equipmentMaintenanceLog.create({
        data: {
          id: "log-cb-69kv-01",
          equipmentId: record.id,
          loggedById: adminUser.id,
          type: "Scheduled Inspection",
          description: "Status: UNDER_MAINTENANCE • Scheduled annual SF6 gas pressure & contact resistance testing initiated",
          findings: "SF6 gas pressure at 0.58 MPa (acceptable baseline). Auxiliary contact alignment within tolerance.",
          actionTaken: "Cleaned terminal bushings and re-torqued control cable lugs.",
          createdAt: new Date(),
        },
      });
    }
  }

  console.log("Successfully created 8 Tumauini HEPP plant equipment records and maintenance logs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
