import "dotenv/config";
import { prisma } from "./lib/db/prisma";

async function runVisitorProof() {
  const project = await prisma.project.findFirst();
  if (!project) throw new Error("Project not found");

  const guard = await prisma.user.findFirst();
  if (!guard) throw new Error("User not found");

  const host = await prisma.user.findFirst();
  if (!host) throw new Error("Host not found");

  console.log("--- PROOF: Visitor Log In and Out ---");

  // Step 1: Log in
  let visitor = await prisma.visitor.create({
    data: {
      projectId: project.id,
      fullName: "TEST_VISITOR_" + Date.now(),
      organization: "Acme Corp",
      purpose: "Site Inspection",
      hostId: host.id,
      loggedById: guard.id,
      status: "CHECKED_IN",
    }
  });

  console.log("STATE 1 (Checked In):");
  console.log(`  Name: ${visitor.fullName}`);
  console.log(`  Status: ${visitor.status}`);
  console.log(`  Time In: ${visitor.timeIn}`);
  console.log(`  Time Out: ${visitor.timeOut || "null"}`);

  // Step 2: Check out
  visitor = await prisma.visitor.update({
    where: { id: visitor.id },
    data: {
      status: "CHECKED_OUT",
      timeOut: new Date()
    }
  });

  console.log("\nSTATE 2 (Checked Out):");
  console.log(`  Status: ${visitor.status}`);
  console.log(`  Time In: ${visitor.timeIn}`);
  console.log(`  Time Out: ${visitor.timeOut}`);

  console.log("\nVisitor proof completed.");
}

runVisitorProof().catch(console.error);
