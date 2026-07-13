import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// Stylesheet definition with standard layout properties (no shorthands)
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.4,
    color: "#0f172a",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderStyle: "solid",
    borderColor: "#0d9488",
    paddingBottom: 10,
    marginBottom: 15,
  },
  logoText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: "#0d9488",
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#475569",
    textAlign: "right",
  },
  reportMetaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  metaColumn: {
    width: "48%",
  },
  metaItem: {
    marginBottom: 6,
  },
  metaLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 10,
    color: "#0f172a",
    marginTop: 1,
  },
  statusBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 6,
    paddingRight: 6,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  statusSubmitted: {
    backgroundColor: "#fef3c7",
    color: "#d97706",
  },
  statusApproved: {
    backgroundColor: "#ccfbf1",
    color: "#0f766e",
  },
  statusRejected: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  },
  // Section layout
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#0d9488",
    borderBottomWidth: 1,
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    paddingBottom: 3,
    marginBottom: 8,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#f1f5f9",
    padding: 10,
    marginBottom: 10,
  },
  reviewCard: {
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    padding: 10,
    marginBottom: 12,
  },
  reviewApproved: {
    backgroundColor: "#f0fdfa",
    borderColor: "#ccfbf1",
  },
  reviewRejected: {
    backgroundColor: "#fdf2f2",
    borderColor: "#fde2e2",
  },
  boldText: {
    fontFamily: "Helvetica-Bold",
  },
  italicText: {
    fontFamily: "Helvetica-Oblique",
  },
  bodyText: {
    fontSize: 9.5,
    color: "#334155",
  },
  gridTwoColumns: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  gridColumn: {
    width: "48%",
  },
  // Photo Gallery
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 5,
  },
  photoCard: {
    width: "48%",
    marginBottom: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    borderRadius: 4,
    backgroundColor: "#f8fafc",
    padding: 4,
  },
  photoImage: {
    width: "100%",
    height: 100,
    objectFit: "cover",
    borderRadius: 2,
  },
  photoCaption: {
    fontSize: 7.5,
    color: "#64748b",
    marginTop: 4,
    paddingLeft: 2,
    paddingRight: 2,
    lineHeight: 1.2,
  },
  pageNumber: {
    position: "absolute",
    fontSize: 8,
    color: "#94a3b8",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
  },
});

interface Photo {
  id: string;
  storagePath: string;
  caption: string | null;
  signedUrl: string;
}

interface ReportData {
  id: string;
  projectId: string;
  reportDate: string;
  workArea: string;
  weatherCondition: string;
  accomplishments: string;
  equipmentUsed: string | null;
  materialsUsed: string | null;
  delays: string | null;
  remarks: string | null;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  reviewedById: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  submittedBy: {
    name: string;
    email: string;
  };
  reviewedBy?: {
    name: string;
  } | null;
  photos: Photo[];
}

interface ReportPdfTemplateProps {
  report: ReportData;
}

export function ReportPdfTemplate({ report }: ReportPdfTemplateProps) {
  const formattedReportDate = new Date(report.reportDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedSubmissionDate = new Date(report.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedReviewDate = report.reviewedAt
    ? new Date(report.reviewedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // Helper styles for status badges
  let statusBadgeStyle = styles.statusSubmitted;
  let statusLabel = "PENDING REVIEW";
  if (report.status === "APPROVED") {
    statusBadgeStyle = styles.statusApproved;
    statusLabel = "APPROVED";
  } else if (report.status === "REJECTED") {
    statusBadgeStyle = styles.statusRejected;
    statusLabel = "REJECTED";
  }

  const hasPhotos = report.photos && report.photos.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Block */}
        <View style={styles.headerContainer}>
          <Text style={styles.logoText}>PROJECT NEXUS</Text>
          <View>
            <Text style={styles.headerTitle}>DAILY ACCOMPLISHMENT REPORT</Text>
            <Text style={{ fontSize: 8, color: "#64748b", textAlign: "right", marginTop: 2 }}>
              Report ID: #{report.id.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Metadata Details Grid */}
        <View style={styles.reportMetaContainer}>
          <View style={styles.metaColumn}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Report Date</Text>
              <Text style={styles.metaValue}>{formattedReportDate}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Work Area</Text>
              <Text style={[styles.metaValue, styles.boldText]}>{report.workArea}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Weather Condition</Text>
              <Text style={styles.metaValue}>{report.weatherCondition}</Text>
            </View>
          </View>

          <View style={styles.metaColumn}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Submitted By</Text>
              <Text style={styles.metaValue}>
                {report.submittedBy.name} ({report.submittedBy.email})
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Submission Date</Text>
              <Text style={styles.metaValue}>{formattedSubmissionDate}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Report Status</Text>
              <Text style={[styles.statusBadge, statusBadgeStyle]}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        {/* Reviewer Details Box */}
        {report.status === "APPROVED" && report.reviewedBy && (
          <View style={[styles.reviewCard, styles.reviewApproved]}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9, color: "#0f766e", marginBottom: 3 }}>
              ✔ Report Approved
            </Text>
            <Text style={{ fontSize: 8.5, color: "#115e59" }}>
              Approved by <Text style={styles.boldText}>{report.reviewedBy.name}</Text> on {formattedReviewDate}
            </Text>
          </View>
        )}

        {report.status === "REJECTED" && report.reviewedBy && (
          <View style={[styles.reviewCard, styles.reviewRejected]}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9, color: "#b91c1c", marginBottom: 3 }}>
              ✘ Report Rejected
            </Text>
            <Text style={{ fontSize: 8.5, color: "#991b1b", marginBottom: 4 }}>
              Rejected by <Text style={styles.boldText}>{report.reviewedBy.name}</Text> on {formattedReviewDate}
            </Text>
            <Text style={{ fontSize: 8.5, color: "#7f1d1d" }}>
              <Text style={styles.boldText}>Reason: </Text>
              {report.rejectionReason}
            </Text>
          </View>
        )}

        {/* Section: Accomplishments */}
        <Text style={styles.sectionTitle}>Accomplishments</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>{report.accomplishments}</Text>
        </View>

        {/* Section: Resources & Site Logs */}
        <View style={styles.gridTwoColumns}>
          <View style={styles.gridColumn}>
            <Text style={styles.sectionTitle}>Equipment Used</Text>
            <View style={[styles.card, { minHeight: 60 }]}>
              {report.equipmentUsed ? (
                <Text style={styles.bodyText}>{report.equipmentUsed}</Text>
              ) : (
                <Text style={[styles.bodyText, styles.italicText, { color: "#94a3b8" }]}>None specified</Text>
              )}
            </View>
          </View>

          <View style={styles.gridColumn}>
            <Text style={styles.sectionTitle}>Materials Used</Text>
            <View style={[styles.card, { minHeight: 60 }]}>
              {report.materialsUsed ? (
                <Text style={styles.bodyText}>{report.materialsUsed}</Text>
              ) : (
                <Text style={[styles.bodyText, styles.italicText, { color: "#94a3b8" }]}>None specified</Text>
              )}
            </View>
          </View>
        </View>

        {/* Section: Delays & Remarks */}
        <View style={styles.gridTwoColumns}>
          <View style={styles.gridColumn}>
            <Text style={styles.sectionTitle}>Delays</Text>
            <View style={[styles.card, { minHeight: 60 }]}>
              {report.delays ? (
                <Text style={[styles.bodyText, { color: "#b91c1c" }]}>{report.delays}</Text>
              ) : (
                <Text style={[styles.bodyText, styles.italicText, { color: "#94a3b8" }]}>No delays encountered</Text>
              )}
            </View>
          </View>

          <View style={styles.gridColumn}>
            <Text style={styles.sectionTitle}>Remarks</Text>
            <View style={[styles.card, { minHeight: 60 }]}>
              {report.remarks ? (
                <Text style={styles.bodyText}>{report.remarks}</Text>
              ) : (
                <Text style={[styles.bodyText, styles.italicText, { color: "#94a3b8" }]}>None specified</Text>
              )}
            </View>
          </View>
        </View>

        {/* Photo Gallery (if photos exist) */}
        {hasPhotos && (
          <View style={{ marginTop: 10 }} break>
            <Text style={styles.sectionTitle}>Attached Photos</Text>
            <View style={styles.photoGrid}>
              {report.photos.map((photo) => (
                <View key={photo.id} style={styles.photoCard} wrap={false}>
                  {photo.signedUrl ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image src={photo.signedUrl} style={styles.photoImage} />
                  ) : (
                    <View style={[styles.photoImage, { backgroundColor: "#e2e8f0", justifyContent: "center", alignItems: "center" }]}>
                      <Text style={{ color: "#94a3b8", fontSize: 8 }}>Image Unavailable</Text>
                    </View>
                  )}
                  {photo.caption && (
                    <Text style={styles.photoCaption}>{photo.caption}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer Page Number */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
}
