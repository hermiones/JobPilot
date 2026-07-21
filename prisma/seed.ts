import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_USER_EMAIL = "you@jobpilot.local";

const MASTER_RESUME = `Jordan Lee — Software Engineer
Summary: Full-stack engineer with 5 years building web apps in TypeScript, React, and Node.js. Experience with REST APIs, PostgreSQL, and AWS.

Experience:
- Senior Software Engineer, Acme Corp (2022–present): Led a 4-person team building a React + Node.js dashboard serving 20k daily users. Cut page load time 40% by introducing server-side rendering with Next.js. Designed REST and GraphQL APIs backed by PostgreSQL.
- Software Engineer, Beta Inc (2019–2022): Built customer-facing features in React and TypeScript. Implemented CI/CD with GitHub Actions and Docker. Improved test coverage from 30% to 85% with Jest.

Skills: TypeScript, JavaScript, React, Next.js, Node.js, Express, PostgreSQL, GraphQL, REST, AWS, Docker, CI/CD, Jest, Tailwind CSS.

Education: B.S. Computer Science, State University (2019).`;

const MOCK_JOBS = [
  {
    source: "manual",
    externalId: "mock-1",
    title: "Senior Frontend Engineer (React)",
    company: "Nimbus Cloud",
    location: "Remote (US)",
    url: "https://example.com/jobs/nimbus-frontend",
    description:
      "We are hiring a Senior Frontend Engineer to build our React and Next.js dashboard. You will work with TypeScript, Tailwind CSS, and a Node.js backend. Experience with GraphQL and server-side rendering is a plus. 5+ years of frontend experience required.",
    salaryRange: "$150,000 – $190,000",
  },
  {
    source: "manual",
    externalId: "mock-2",
    title: "Full Stack Engineer",
    company: "Beacon Labs",
    location: "Remote",
    url: "https://example.com/jobs/beacon-fullstack",
    description:
      "Join Beacon Labs as a Full Stack Engineer working across React, Node.js, Express, and PostgreSQL. We value strong TypeScript skills and experience shipping REST APIs. Bonus: AWS and Docker.",
    salaryRange: "$140,000 – $175,000",
  },
  {
    source: "manual",
    externalId: "mock-3",
    title: "Staff Backend Engineer (Go)",
    company: "Quill Systems",
    location: "New York, NY",
    url: "https://example.com/jobs/quill-backend",
    description:
      "Staff Backend Engineer to design distributed systems in Go and Kubernetes. Deep experience with gRPC, Postgres, and cloud infrastructure required. This is not a frontend role.",
    salaryRange: "$180,000 – $220,000",
  },
  {
    source: "manual",
    externalId: "mock-4",
    title: "Software Engineer, Platform",
    company: "Lumen Data",
    location: "Remote (US)",
    url: "https://example.com/jobs/lumen-platform",
    description:
      "Platform Software Engineer building internal tools with TypeScript, Node.js, and React. You will own CI/CD pipelines using GitHub Actions and Docker, and write tests with Jest. PostgreSQL experience valued.",
    salaryRange: "$130,000 – $165,000",
  },
  {
    source: "manual",
    externalId: "mock-5",
    title: "Junior Web Developer",
    company: "Sprout Media",
    location: "Austin, TX",
    url: "https://example.com/jobs/sprout-junior",
    description:
      "Entry-level Web Developer role. Build marketing pages in HTML, CSS, and a bit of JavaScript. Great for new grads. No backend experience required.",
    salaryRange: "$70,000 – $90,000",
  },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {},
    create: {
      email: DEFAULT_USER_EMAIL,
      masterResume: MASTER_RESUME,
      coverLetterTemplates: JSON.stringify([
        {
          tone: "professional",
          body: "Dear Hiring Manager, I am excited to apply for this role. My background aligns well with your needs...",
        },
        {
          tone: "enthusiastic",
          body: "Hi team! I've been following your work and would love to contribute...",
        },
      ]),
      targetRoles: JSON.stringify([
        "Software Engineer",
        "Full Stack Engineer",
        "Frontend Engineer",
      ]),
      targetLocations: JSON.stringify(["Remote", "New York"]),
      salaryFloor: 120000,
      excludedCompanies: JSON.stringify(["Sprout Media"]),
      dailyGoal: 50,
    },
  });

  for (const job of MOCK_JOBS) {
    await prisma.jobListing.upsert({
      where: {
        source_externalId: { source: job.source, externalId: job.externalId },
      },
      update: {},
      create: {
        ...job,
        postedDate: new Date(),
      },
    });
  }

  console.log(`Seeded user ${user.email} and ${MOCK_JOBS.length} mock jobs.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
