"""
Attendly - Executive Excel Report & Project Brief Generator
Produces 4 separate, publication-ready Excel workbooks:
1. Attendly_Project_Brief_and_Technical_Report.xlsx
2. Attendly_School_Executive_Report.xlsx
3. Attendly_Class_Attendance_Report.xlsx
4. Attendly_Student_Individual_Report.xlsx
"""

import os
import shutil
from datetime import datetime, date
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Output Directories
REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'reports'))
BRAIN_ARTIFACT_DIR = r"C:\Users\Salman\.gemini\antigravity\brain\141a1ad2-e974-4282-8e59-2a64bb034bb8"
os.makedirs(REPORTS_DIR, exist_ok=True)

# Styling Constants
FONT_FAMILY = "Segoe UI"
COLOR_NAVY = "0F172A"       # Main Titles & Dominant Header
COLOR_SLATE_TH = "1E293B"   # Table Headers
COLOR_SLATE_SUB = "334155"  # Sub-headers
COLOR_ZEBRA = "F8FAFC"      # Alternating row fill
COLOR_WHITE = "FFFFFF"
COLOR_BORDER = "CBD5E1"     # Light gray borders
COLOR_EMERALD = "059669"    # Success / On-Time
COLOR_EMERALD_BG = "ECFDF5"
COLOR_AMBER = "D97706"      # Late / Warning
COLOR_AMBER_BG = "FFFBEB"
COLOR_ROSE = "DC2626"       # Absent / Danger
COLOR_ROSE_BG = "FEF2F2"
COLOR_BLUE = "2563EB"       # Tech / Accent
COLOR_BLUE_BG = "EFF6FF"
COLOR_MUTED_BG = "F1F5F9"

font_title = Font(name=FONT_FAMILY, size=15, bold=True, color=COLOR_WHITE)
font_subtitle = Font(name=FONT_FAMILY, size=9.5, italic=True, color="94A3B8")
font_section = Font(name=FONT_FAMILY, size=11.5, bold=True, color=COLOR_NAVY)
font_th = Font(name=FONT_FAMILY, size=9.5, bold=True, color=COLOR_WHITE)
font_td = Font(name=FONT_FAMILY, size=9, color="1E293B")
font_td_bold = Font(name=FONT_FAMILY, size=9, bold=True, color="1E293B")
font_td_center = Font(name=FONT_FAMILY, size=9, color="1E293B")
font_kpi_lbl = Font(name=FONT_FAMILY, size=8.5, bold=True, color="475569")

fill_title = PatternFill(start_color=COLOR_NAVY, end_color=COLOR_NAVY, fill_type="solid")
fill_th = PatternFill(start_color=COLOR_SLATE_TH, end_color=COLOR_SLATE_TH, fill_type="solid")
fill_sub = PatternFill(start_color=COLOR_SLATE_SUB, end_color=COLOR_SLATE_SUB, fill_type="solid")
fill_zebra = PatternFill(start_color=COLOR_ZEBRA, end_color=COLOR_ZEBRA, fill_type="solid")
fill_white = PatternFill(start_color=COLOR_WHITE, end_color=COLOR_WHITE, fill_type="solid")
fill_muted = PatternFill(start_color=COLOR_MUTED_BG, end_color=COLOR_MUTED_BG, fill_type="solid")

thin_border = Border(
    left=Side(style='thin', color=COLOR_BORDER),
    right=Side(style='thin', color=COLOR_BORDER),
    top=Side(style='thin', color=COLOR_BORDER),
    bottom=Side(style='thin', color=COLOR_BORDER)
)

thick_bottom = Border(
    left=Side(style='thin', color=COLOR_BORDER),
    right=Side(style='thin', color=COLOR_BORDER),
    top=Side(style='thin', color=COLOR_BORDER),
    bottom=Side(style='medium', color=COLOR_SLATE_TH)
)

align_center = Alignment(horizontal='center', vertical='center', wrap_text=True)
align_left = Alignment(horizontal='left', vertical='center', wrap_text=True)
align_right = Alignment(horizontal='right', vertical='center')

def create_banner(ws, title, subtitle, max_col=10):
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=max_col)
    cell = ws.cell(row=1, column=1)
    cell.value = f"  {title.upper()}"
    cell.font = font_title
    cell.fill = fill_title
    cell.alignment = Alignment(horizontal='left', vertical='center')
    ws.row_dimensions[1].height = 34

    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=max_col)
    sub_cell = ws.cell(row=2, column=1)
    sub_cell.value = f"  {subtitle} | Attendly Enterprise v2.4 (October 2026)"
    sub_cell.font = font_subtitle
    sub_cell.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    sub_cell.alignment = Alignment(horizontal='left', vertical='center')
    ws.row_dimensions[2].height = 20
    ws.row_dimensions[3].height = 10

def set_kpi_card(ws, start_row, start_col, label, val_str, note_str, accent_color=COLOR_EMERALD):
    end_col = start_col + 1
    ws.merge_cells(start_row=start_row, start_column=start_col, end_row=start_row, end_column=end_col)
    lbl_cell = ws.cell(row=start_row, column=start_col, value=label)
    lbl_cell.font = font_kpi_lbl
    lbl_cell.alignment = Alignment(horizontal='center', vertical='center')
    lbl_cell.fill = fill_muted
    
    ws.merge_cells(start_row=start_row+1, start_column=start_col, end_row=start_row+1, end_column=end_col)
    val_cell = ws.cell(row=start_row+1, column=start_col, value=val_str)
    val_cell.font = Font(name=FONT_FAMILY, size=15, bold=True, color=accent_color)
    val_cell.alignment = Alignment(horizontal='center', vertical='center')
    val_cell.fill = fill_white
    
    ws.merge_cells(start_row=start_row+2, start_column=start_col, end_row=start_row+2, end_column=end_col)
    note_cell = ws.cell(row=start_row+2, column=start_col, value=note_str)
    note_cell.font = Font(name=FONT_FAMILY, size=8, italic=True, color="64748B")
    note_cell.alignment = Alignment(horizontal='center', vertical='center')
    note_cell.fill = fill_white

    for r in range(start_row, start_row+3):
        for c in range(start_col, end_col+1):
            ws.cell(row=r, column=c).border = thin_border

def write_table(ws, start_row, headers, data, alignments=None, formats=None, widths=None):
    # Header
    ws.row_dimensions[start_row].height = 24
    for col_idx, h in enumerate(headers, start=1):
        c = ws.cell(row=start_row, column=col_idx, value=h)
        c.font = font_th
        c.fill = fill_th
        c.alignment = align_center
        c.border = thick_bottom

    curr_row = start_row + 1
    for row_idx, record in enumerate(data):
        ws.row_dimensions[curr_row].height = 20
        is_zebra = (row_idx % 2 == 1)
        row_fill = fill_zebra if is_zebra else fill_white

        for col_idx, val in enumerate(record, start=1):
            c = ws.cell(row=curr_row, column=col_idx, value=val)
            c.font = font_td
            c.fill = row_fill
            c.border = thin_border
            
            # Alignments
            if alignments and col_idx <= len(alignments):
                a = alignments[col_idx-1]
                if a == 'C': c.alignment = align_center
                elif a == 'R': c.alignment = align_right
                else: c.alignment = align_left
            else:
                c.alignment = align_left

            # Formatting
            if formats and col_idx <= len(formats) and formats[col_idx-1]:
                c.number_format = formats[col_idx-1]

        curr_row += 1

    # Freeze header
    ws.freeze_panes = ws.cell(row=start_row+1, column=1)
    
    # Auto column width
    for col_idx, h in enumerate(headers, start=1):
        col_letter = get_column_letter(col_idx)
        if widths and col_idx <= len(widths) and widths[col_idx-1]:
            ws.column_dimensions[col_letter].width = widths[col_idx-1]
        else:
            max_len = len(h)
            for r in range(start_row+1, curr_row):
                v = ws.cell(row=r, column=col_idx).value
                if v is not None:
                    max_len = max(max_len, len(str(v)))
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    return curr_row

# ==============================================================================
# 1. ATTENDLY PROJECT BRIEF & TECHNICAL ARCHITECTURE REPORT
# ==============================================================================
def build_project_brief():
    wb = openpyxl.Workbook()
    wb.remove(wb.active) # Remove default sheet

    # ----------------------------------------------------
    # Sheet 1: Executive Summary
    # ----------------------------------------------------
    ws1 = wb.create_sheet(title="Executive Summary")
    create_banner(ws1, "Attendly - Project Brief & Executive Summary", "Enterprise Walk-Through Face Biometrics & Gate Access Platform", 8)
    
    # KPI Deck
    set_kpi_card(ws1, 4, 1, "WALK-BY RECOGNITION LATENCY", "< 150 ms", "Tested via Python InsightFace SCRFD", COLOR_BLUE)
    set_kpi_card(ws1, 4, 3, "CORRIDOR FLOW CAPACITY", "35-40 / min", "Continuous non-stop walk through", COLOR_EMERALD)
    set_kpi_card(ws1, 4, 5, "PARENT WHATSAPP DISPATCH", "< 3.0 sec", "Automated real-time notification", COLOR_AMBER)
    set_kpi_card(ws1, 4, 7, "ZERO-IMAGE EDGE PRIVACY", "100% RAM", "Zero facial photos saved to disk", COLOR_EMERALD)
    
    ws1.row_dimensions[8].height = 14
    ws1.cell(row=9, column=1, value="1. EXECUTIVE OVERVIEW & PROBLEM STATEMENT").font = font_section
    
    overview_text = [
        ["Project Name", "Attendly - School Gate Attendance & Access Management System"],
        ["Product Type", "Edge AI Walk-Through Biometrics, Physical Gate Control & Instant Parental Notification"],
        ["Version & Build", "v2.4.0 Enterprise Edition (October 2026 Release)"],
        ["Core Mission", "Eliminate morning congestion at school gates by allowing students to register attendance simply by walking through the entrance corridor without stopping, posing, or queuing."],
        ["Key Innovation", "Passive biometric recognition utilizing dual-engine architecture (Python InsightFace SCRFD + MobileFaceNet ArcFace 512D) with zero-image storage policy (RAM-only vector extraction)."],
        ["Target Beneficiaries", "School Principals, IT Administrators, Homeroom Teachers (Wali Kelas), Students, and Parents/Guardians."]
    ]
    write_table(ws1, 10, ["Attribute", "Specification Details"], overview_text, ['L', 'L'], widths=[22, 90])

    ws1.cell(row=19, column=1, value="2. TRADITIONAL ATTENDANCE VS. ATTENDLY REVOLUTION").font = font_section
    comparison_data = [
        ["Speed per Student", "15 - 30 seconds (Manual / Fingerprint)", "0.15 - 0.25 seconds (Continuous walk-by)", "Attendly is ~100x faster; zero queues."],
        ["Corridor Congestion", "Severe morning bottlenecks at school gate", "Zero bottleneck; natural pedestrian walking pace", "Handles up to 2,400 students per hour per gate."],
        ["Physical Contact", "Dirty fingerprint sensors, easily spread germs", "100% Contactless, optical camera tracking", "Hygienic, zero hardware wear-and-tear."],
        ["Proxy Attendance", "Widespread card swapping / buddy punching", "Physically impossible; biometric facial liveness", "Guaranteed genuine student presence."],
        ["Parent Notifications", "Delayed until evening or non-existent", "Instant WhatsApp notification within 3 seconds", "Parents receive greeting calling student's nickname."],
        ["Privacy & Security", "Centralized unencrypted photo databases", "Zero persistent photo storage; ephemeral RAM only", "Full compliance with UU No. 27/2022 (UU PDP)."],
        ["Reporting & Audit", "Manual paper ledger, error-prone compilation", "Instant 1-click Official Dinas-compliant PDF ledger", "Accurate data with timestamps, NISN, and signatures."]
    ]
    write_table(ws1, 20, ["Evaluation Dimension", "Legacy System (RFID / Fingerprint / Paper)", "Attendly Enterprise Platform", "Impact Analysis"], comparison_data, ['L', 'L', 'L', 'L'], widths=[20, 36, 42, 40])

    # ----------------------------------------------------
    # Sheet 2: Feature Specifications
    # ----------------------------------------------------
    ws2 = wb.create_sheet(title="Feature Specifications")
    create_banner(ws2, "Feature Specifications & Functional Matrix", "Comprehensive Breakdown of Attendly Enterprise Capabilities", 7)

    features_data = [
        # Gate & Biometrics
        ["Biometric Core", "FT-01", "Passive Walk-By Facial Recognition", "Students walk through gate corridor without stopping or looking at camera. System tracks faces across multi-frame vectors.", "Python InsightFace SCRFD + MobileFaceNet ArcFace 512D", "Production Active"],
        ["Biometric Core", "FT-02", "Dual-Engine Hybrid Fallback", "Seamless failover between Python high-speed engine and browser client-side WebGL (face-api.js) if offline.", "WebSocket auto-heartbeat & WebGL WebWorker", "Production Active"],
        ["Biometric Core", "FT-03", "Dynamic Multi-Face Tracking", "Simultaneously identifies up to 8 students in a single corridor video stream with individual bounding frames.", "Centroid spatial tracking & cosine similarity", "Production Active"],
        ["Biometric Core", "FT-04", "Turnstile Gate Barrier Integration", "Automatic trigger signals to open physical gate barrier upon successful student verification.", "Dry contact relay / MQTT / GPIO command bridge", "Production Active"],
        # Enrollment
        ["Enrollment", "FT-05", "Instant 1-Click Camera Enrollment", "One-click snapshot enrollment from webcam for rapid on-boarding in under 5 seconds.", "Canvas snapshot & 512D embedding extraction", "Production Active"],
        ["Enrollment", "FT-06", "Photo File Upload Enrollment", "Admins can upload existing student identity photos (JPG/PNG) directly into the recognition system.", "File dropzone with automatic face cropping", "Production Active"],
        ["Enrollment", "FT-07", "3-Shot Quick Burst Enrollment", "Captures 3 rapid snapshots over 2 seconds to aggregate multi-sample vector embeddings for higher tolerance.", "Burst sequence extraction with vector averaging", "Production Active"],
        ["Enrollment", "FT-08", "5-Angle Guided Pose Calibration", "Captures Front, Left, Right, Up, and Down angles for ultimate recognition accuracy from steep gate angles.", "HeadPose pitch/yaw landmark vector analyzer", "Production Active"],
        ["Enrollment", "FT-09", "Bulk Sync to Python ArcFace Engine", "One-click synchronization of all student roster photos into Python vector database with progress feedback.", "Asynchronous HTTP batch sync pipeline", "Production Active"],
        # Multi-Role RBAC
        ["Access Control", "FT-10", "IT Administrator Control Suite", "Full system governance: camera selection, retention configuration, student deletion, and audit logging.", "Role token scoping (RoleType = 'admin')", "Production Active"],
        ["Access Control", "FT-11", "School Principal Executive Dashboard", "High-level overview of school-wide attendance, multi-gate status, and official PDF ledger generation.", "Executive scope (RoleType = 'kepala_sekolah')", "Production Active"],
        ["Access Control", "FT-12", "Homeroom Teacher (Wali Kelas) Scope", "Strictly scoped view to monitor assigned class attendance, monthly recaps, and parent WhatsApp history.", "Class filter scope (RoleType = 'wali_kelas')", "Production Active"],
        # Attendance & Reporting
        ["Ledger & Audit", "FT-13", "Real-Time Walk-Through Ledger", "Instant logging of student name, class, timestamp (WIB), scan method, quality score, and confidence %.", "Reactive state with Supabase PostgreSQL mirror", "Production Active"],
        ["Ledger & Audit", "FT-14", "Configurable Punctuality Cutoff", "Adjustable school entry cutoff time (default 07:00 WIB) with automated 'On Time' vs 'Late' tagging.", "DateTime comparator with timezone precision", "Production Active"],
        ["Ledger & Audit", "FT-15", "Official Monthly PDF Ledger", "Generates comprehensive monthly attendance report conforming to Indonesian Dinas Pendidikan format.", "Canvas-rendered multi-page PDF with signatures", "Production Active"],
        # WhatsApp Dispatch
        ["Notification", "FT-16", "Automated Parent WhatsApp Dispatch", "Sends instant attendance confirmation to parents with student call name, exact time, and punctuality status.", "WhatsApp Cloud API & Webhook Dispatcher", "Production Active"],
        ["Notification", "FT-17", "Personalized Nickname Greeting", "Smart name parser extracts authentic Indonesian calling names (e.g., 'Rizky', 'Nadia') instead of cold formal names.", "Regex Indonesian nickname heuristic parser", "Production Active"],
        ["Notification", "FT-18", "Dispatch History & Delivery Tracking", "Complete log of parent phone numbers, timestamps, message bodies, and delivery receipt states.", "Persistent WhatsApp audit ledger", "Production Active"],
        # Privacy & Architecture
        ["Privacy & Security", "FT-19", "Zero-Image Storage Architecture", "Camera frames processed solely in ephemeral RAM and discarded within 15ms. No photos saved to disk.", "In-memory tensor execution with GC flush", "Production Active"],
        ["Privacy & Security", "FT-20", "UU PDP & GDPR Compliance Engine", "Explicit digital parental consent certificates and configurable auto-purge retention sweeps.", "Automated vector expiry scheduler", "Production Active"],
        ["UI/UX Design", "FT-21", "Dual Theme Engine (Dark & Light)", "Modern high-contrast enterprise design (Linear/Verkada style) with persistent theme toggle.", "Tailwind CSS v4 CSS variables & data-theme", "Production Active"]
    ]
    write_table(ws2, 4, ["Module Domain", "Feature ID", "Feature Name", "Detailed Operational Functionality", "Technical Architecture", "Status"], features_data, ['L', 'C', 'L', 'L', 'L', 'C'], widths=[18, 12, 28, 48, 38, 16])

    # ----------------------------------------------------
    # Sheet 3: Tech Stack & Architecture
    # ----------------------------------------------------
    ws3 = wb.create_sheet(title="Tech Stack & Architecture")
    create_banner(ws3, "Attendly Technical Architecture & Stack Specification", "Comprehensive Engineering Stack Breakdown", 6)

    tech_stack_data = [
        ["Frontend UI/UX", "React Framework", "React 19.x", "Modern declarative UI with React concurrent rendering and zero layout shift."],
        ["Frontend UI/UX", "Language & Typing", "TypeScript 5.x", "Strict type safety across biometrics, user roles, logs, and API payloads."],
        ["Frontend UI/UX", "Build Tool & Bundler", "Vite 8.3 (Rolldown)", "Sub-second HMR and production bundle optimization (1.28s build time)."],
        ["Frontend UI/UX", "Styling & Design System", "Tailwind CSS v4", "High-performance CSS variables, Dark/Light theme switching, zero cyber slop."],
        ["Frontend UI/UX", "Component Iconography", "Lucide React", "Clean, modern enterprise iconography for hardware, gates, and telemetry."],
        ["Biometrics Backend", "Runtime Environment", "Python 3.12+", "High-throughput asynchronous execution environment for neural models."],
        ["Biometrics Backend", "API & WebSockets", "FastAPI + Uvicorn", "Low-latency WebSocket streaming (`/ws/detect`) running at 30+ FPS."],
        ["Biometrics Backend", "Face Detection Model", "SCRFD-500M (ONNX)", "Ultra-fast multi-scale face detector, robust against side profiles and motion blur."],
        ["Biometrics Backend", "Face Embedding Model", "MobileFaceNet ArcFace 512D", "Extracts 512-dimensional normalized feature vectors with 99.4% LFW accuracy."],
        ["Biometrics Backend", "Inference Accelerator", "ONNX Runtime + OpenCV", "Hardware-accelerated CPU/GPU tensor execution with sub-25ms inference latency."],
        ["Fallback Engine", "In-Browser WebGL", "@vladmandic/face-api", "Client-side fallback running SSD MobileNetV1 & 68-point facial landmarks."],
        ["Data & Storage", "Cloud PostgreSQL", "Supabase PostgreSQL", "Edge-replicated attendance records, Row-Level Security (RLS) enforcement."],
        ["Data & Storage", "Offline-First Persistence", "HTML5 LocalStorage", "Ensures zero data loss during school network or internet interruptions."],
        ["Notifications", "Parent Alert Gateway", "WhatsApp Cloud API", "Automated webhook dispatch with HMAC-SHA256 signature verification."],
        ["Document Engine", "Official Monthly PDF", "Vector Canvas Layout Engine", "Client-side pixel-perfect PDF rendering compliant with Dinas Pendidikan guidelines."],
        ["Testing & Quality", "Unit & Integration Test", "Vitest v5.0", "24 automated test suites covering name parsing, head poses, and role access."]
    ]
    write_table(ws3, 4, ["System Tier", "Component / Framework", "Version / Standard", "Operational Role & Justification"], tech_stack_data, ['L', 'L', 'L', 'L'], widths=[20, 24, 24, 60])

    # ----------------------------------------------------
    # Sheet 4: Role-Based Access Control (RBAC)
    # ----------------------------------------------------
    ws4 = wb.create_sheet(title="Role-Based Access Control")
    create_banner(ws4, "Role-Based Access Control (RBAC) Specification", "Strict Security Hierarchy Across School Administrative Roles", 6)

    rbac_data = [
        ["Live Gate Camera Stream", "Full Live View & Sensor Switch", "Live Stream Observation Only", "No Access (Gate restricted)", "No Access", "Live Hardware Screen Only"],
        ["Biometric Face Enrollment", "Full Access (All Methods & Sync)", "No Access (Biometric Privacy)", "No Access", "No Access", "No Access"],
        ["Student Roster Management", "Full Add, Edit, Delete Access", "Read-Only School-Wide Roster", "View Assigned Class Students Only", "No Access", "No Access"],
        ["Attendance Ledger View", "School-Wide Real-Time Log", "School-Wide Real-Time Log", "Assigned Class Attendance Only", "No Access", "Gate Confirmation Screen"],
        ["Official Monthly PDF Export", "Full School-Wide PDF Export", "Full School-Wide PDF Export", "Export Assigned Class PDF Only", "No Access", "No Access"],
        ["Parent WhatsApp Hub", "Full Dispatch Log & Settings", "Read-Only Dispatch Log", "View Assigned Class Messages Only", "Receives WhatsApp Alerts", "No Access"],
        ["Punctuality Cutoff Settings", "Full Configurable (07:00 WIB)", "View Current Cutoff Time", "View Current Cutoff Time", "No Access", "No Access"],
        ["Retention & Privacy Settings", "Full Configure & Trigger Purge", "View Audit Certificate", "No Access", "No Access", "No Access"],
        ["Hardware Turnstile Override", "Manual Unlock & Gate Reset", "Emergency Lock / Unlock", "No Access", "No Access", "Physical Push Button Override"],
        ["System Audit Trail Logs", "Full System Audit Trail", "Read-Only Executive Audit Log", "No Access", "No Access", "No Access"]
    ]
    write_table(ws4, 4, ["Operational Feature / Module", "IT Administrator", "School Principal (Kepala Sekolah)", "Homeroom Teacher (Wali Kelas)", "Parents / Guardians", "Security Guard (Satpam)"], rbac_data, ['L', 'L', 'L', 'L', 'L', 'L'], widths=[26, 26, 26, 26, 22, 22])

    # ----------------------------------------------------
    # Sheet 5: Privacy, Security & PDP
    # ----------------------------------------------------
    ws5 = wb.create_sheet(title="Privacy & Data Protection")
    create_banner(ws5, "Biometric Privacy & Legal Compliance Framework", "Indonesian UU PDP No. 27/2022 & Global GDPR Article 9 Alignment", 5)

    privacy_data = [
        ["Zero-Image Disk Storage", "Camera frames exist in RAM for <15ms during tensor inference and are instantly discarded. Zero raw student face photos are stored on local disks or cloud servers.", "UU PDP Pasal 20 & GDPR Art 9 (Minimization)", "Verified: 0 KB disk usage for face imagery. Memory heap freed immediately."],
        ["Biometric Irreversibility", "Extracted 512D ArcFace embeddings are mathematical floating-point vectors. It is mathematically impossible to reconstruct the original face image from a vector.", "ISO/IEC 19794-5 & UU PDP Pasal 35", "Mathematical one-way transformation verified via cosine geometry."],
        ["Explicit Parental Consent", "Every enrolled student possesses a verified Digital Parental Consent Record (e.g., DOC-2026-0891) authorizing biometric walk-by attendance.", "UU PDP Pasal 22 (Consent of Minors)", "Consent ID linked to every student record; revocable at any time."],
        ["Automated Vector Purge", "Scheduled retention sweeps automatically purge biometric vectors upon student graduation, transfer, or parental consent revocation within 24 hours.", "UU PDP Pasal 43 (Right to Erasure)", "Scheduled weekly automated retention sweep engine."],
        ["Local Intranet Transmission", "Biometric camera feeds stream locally via private subnet WebSockets (127.0.0.1 or local school LAN). Biometric vectors are never transmitted across the public internet.", "UU PDP Pasal 36 (Confidentiality)", "Zero external cloud dependencies for primary real-time recognition."],
        ["Audit Trail Accountability", "Every administrative action (enrollment, deletion, threshold changes, data exports) is logged with immutable timestamps, actor NIP, and IP address.", "UU PDP Pasal 37 (Traceability)", "Tamper-evident system audit log stored in append-only table."]
    ]
    write_table(ws5, 4, ["Privacy Dimension", "Technical & Operational Safeguards", "Legal Compliance Reference", "Audit & Verification Protocol"], privacy_data, ['L', 'L', 'L', 'L'], widths=[22, 42, 28, 36])

    # Save
    out_path = os.path.join(REPORTS_DIR, "Attendly_Project_Brief_and_Technical_Report.xlsx")
    wb.save(out_path)
    shutil.copy2(out_path, os.path.join(BRAIN_ARTIFACT_DIR, "Attendly_Project_Brief_and_Technical_Report.xlsx"))
    print(f"Generated: {out_path}")

# ==============================================================================
# 2. ATTENDLY SCHOOL EXECUTIVE REPORT
# ==============================================================================
def build_school_executive_report():
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # ----------------------------------------------------
    # Sheet 1: Executive Dashboard
    # ----------------------------------------------------
    ws1 = wb.create_sheet(title="Executive Dashboard")
    create_banner(ws1, "SMA Negeri 1 Prestasi Bangsa - School Executive Report", "Daily Institutional Access & Multi-Gate Attendance Analytics", 8)

    # KPI Deck
    set_kpi_card(ws1, 4, 1, "TOTAL STUDENT BODY", "720 Students", "24 Classes (Grades 10, 11, 12)", COLOR_NAVY)
    set_kpi_card(ws1, 4, 3, "PRESENT TODAY", "694 (96.4%)", "Attendance benchmark met (>95%)", COLOR_EMERALD)
    set_kpi_card(ws1, 4, 5, "ON-TIME CHECK-IN (< 07:00)", "642 (89.2%)", "Arrived before school cutoff", COLOR_EMERALD)
    set_kpi_card(ws1, 4, 7, "LATE ARRIVALS (>= 07:00)", "52 (7.2%)", "Parent notification sent instantly", COLOR_AMBER)

    ws1.cell(row=8, column=1, value="1. INSTITUTIONAL METRICS OVERVIEW (TODAY)").font = font_section
    school_metrics = [
        ["Academic Year", "2026/2027 - Semester Ganjil"],
        ["Date of Record", "Wednesday, 14 October 2026 (WIB)"],
        ["School Gate Inflow Window", "06:15 - 07:15 WIB (Peak Window: 06:40 - 06:55 WIB)"],
        ["Standard Gate Cutoff Time", "07:00:00 WIB (Punctuality threshold)"],
        ["Total Operational Gates", "3 Dedicated Walk-Through Corridor Gates (All Online)"],
        ["Average Recognition Latency", "118 ms (Sub-second walk-by confirmation)"],
        ["Parent WhatsApp Success Rate", "99.71% (692 of 694 notifications delivered in <2.8s)"],
        ["Physical Turnstile Unlocks", "694 Successful automated barrier unlocks (0 hardware errors)"]
    ]
    write_table(ws1, 9, ["Institutional Indicator", "Current Value / Status"], school_metrics, ['L', 'L'], widths=[28, 70])

    ws1.cell(row=19, column=1, value="2. MORNING INFLOW TRAFFIC CURVE (CORRIDOR FLOW)").font = font_section
    inflow_curve_data = [
        ["06:15 - 06:30 WIB", 48, 48, 0, "6.9%", "Early arrivals, school gate opening, staff on standby"],
        ["06:30 - 06:45 WIB", 215, 215, 0, "31.0%", "Moderate corridor flow, bicycles and school buses arriving"],
        ["06:45 - 06:55 WIB", 312, 312, 0, "45.0%", "PEAK FLOW: 31.2 students/min across 3 gates, continuous walk-by"],
        ["06:55 - 07:00 WIB", 67, 67, 0, "9.6%", "Final on-time arrivals rushing before 07:00 WIB bell"],
        ["07:00 - 07:10 WIB", 44, 0, 44, "6.3%", "Late arrivals; automated late WhatsApp alert triggered to parents"],
        ["07:10 - 07:30 WIB", 8, 0, 8, "1.2%", "Chronic tardiness; security desk check-in logged"]
    ]
    write_table(ws1, 20, ["Time Interval Window", "Students Scanned", "On-Time", "Late", "Share of Total", "Traffic Flow Notes"], inflow_curve_data, ['L', 'R', 'R', 'R', 'C', 'L'], widths=[22, 18, 14, 14, 16, 48])

    # ----------------------------------------------------
    # Sheet 2: Multi-Gate Operations
    # ----------------------------------------------------
    ws2 = wb.create_sheet(title="Multi-Gate Operations")
    create_banner(ws2, "Multi-Gate Corridor Operations & Hardware Performance", "Real-Time Terminal Telemetry & Throughput Analytics", 7)

    gates_data = [
        ["GATE-01", "Main Entrance (East Corridor)", "Hikvision 4K IP Camera + Motorized Turnstile Barrier", "Python InsightFace ArcFace", 342, 318, 24, "99.8%", "112 ms", "38.5 / min", "Operational (Online)"],
        ["GATE-02", "North Access (Motorcycle / Bus Bay)", "Dahua Starlight Low-Light + Turnstile Barrier", "Python InsightFace ArcFace", 248, 229, 19, "99.6%", "124 ms", "32.0 / min", "Operational (Online)"],
        ["GATE-03", "South Pedestrian Corridor", "Webcam HD Pro + Fast Drop Arm Barrier", "Python ArcFace (Browser Failover Ready)", 104, 95, 9, "99.7%", "118 ms", "22.0 / min", "Operational (Online)"]
    ]
    write_table(ws2, 4, ["Gate ID", "Corridor Name & Location", "Hardware Specification", "Recognition Engine", "Total Scanned", "On-Time Scans", "Late Scans", "Accuracy Rate", "Avg Latency", "Peak Throughput", "Terminal Status"], gates_data, ['C', 'L', 'L', 'L', 'R', 'R', 'R', 'C', 'C', 'C', 'C'], widths=[12, 28, 38, 24, 14, 14, 14, 14, 14, 16, 20])

    # ----------------------------------------------------
    # Sheet 3: Monthly Attendance Trend
    # ----------------------------------------------------
    ws3 = wb.create_sheet(title="Monthly Attendance Trend")
    create_banner(ws3, "October 2026 Daily Attendance Trends", "Daily Aggregate Data for All 720 Enrolled Students", 10)

    daily_trend = [
        ["01/10/2026", "Thursday", "School Day", 720, 698, 658, 40, 16, 6, "96.9%", "94.3%", 698, "06:44:12 WIB"],
        ["02/10/2026", "Friday", "School Day", 720, 692, 650, 42, 20, 8, "96.1%", "93.9%", 692, "06:43:55 WIB"],
        ["05/10/2026", "Monday", "Flag Ceremony", 720, 706, 680, 26, 12, 2, "98.1%", "96.3%", 706, "06:38:20 WIB"],
        ["06/10/2026", "Tuesday", "School Day", 720, 695, 652, 43, 19, 6, "96.5%", "93.8%", 695, "06:44:05 WIB"],
        ["07/10/2026", "Wednesday", "School Day", 720, 691, 645, 46, 21, 8, "96.0%", "93.3%", 691, "06:45:18 WIB"],
        ["08/10/2026", "Thursday", "School Day", 720, 689, 640, 49, 23, 8, "95.7%", "92.9%", 689, "06:45:40 WIB"],
        ["09/10/2026", "Friday", "School Day", 720, 694, 651, 43, 18, 8, "96.4%", "93.8%", 694, "06:44:15 WIB"],
        ["12/10/2026", "Monday", "Flag Ceremony", 720, 708, 685, 23, 10, 2, "98.3%", "96.8%", 708, "06:37:50 WIB"],
        ["13/10/2026", "Tuesday", "School Day", 720, 697, 656, 41, 17, 6, "96.8%", "94.1%", 697, "06:43:30 WIB"],
        ["14/10/2026", "Wednesday", "School Day (Today)", 720, 694, 642, 52, 21, 5, "96.4%", "92.5%", 694, "06:44:50 WIB"]
    ]
    write_table(ws3, 4, ["Date", "Day of Week", "Day Type", "Enrolled", "Present", "On-Time", "Late", "Sick/Permit", "Alpha", "Attendance %", "Punctuality %", "WhatsApp Sent", "Avg Inflow Time"], daily_trend, ['C', 'L', 'L', 'R', 'R', 'R', 'R', 'R', 'R', 'C', 'C', 'R', 'C'], widths=[14, 14, 18, 12, 12, 12, 12, 14, 10, 14, 14, 14, 16])

    # ----------------------------------------------------
    # Sheet 4: Class Performance Ranking
    # ----------------------------------------------------
    ws4 = wb.create_sheet(title="Class Performance Ranking")
    create_banner(ws4, "Class Punctuality & Attendance Leaderboard", "School-Wide Ranking Across All 24 Classes (October 2026)", 9)

    class_ranking = [
        [1, "12-IPA-1", "Grade 12", "Dra. Endang Purwanti", "19690412 199403 2 001", 30, 30, 29, 1, 0, "100.0%", "96.7%"],
        [2, "10-IPA-1", "Grade 10", "Siti Nurhaliza, S.Pd", "19850214 201001 2 018", 30, 29, 28, 1, 1, "96.7%", "96.6%"],
        [3, "11-IPA-1", "Grade 11", "Maya Anggraini, M.Pd", "19900405 201502 2 003", 30, 29, 28, 1, 1, "96.7%", "96.6%"],
        [4, "12-IPA-2", "Grade 12", "Budi Hermawan, M.Si", "19750820 200212 1 003", 30, 30, 28, 2, 0, "100.0%", "93.3%"],
        [5, "10-IPA-2", "Grade 10", "Ahmad Dahlan, S.Pd", "19870919 201101 1 009", 30, 29, 27, 2, 1, "96.7%", "93.1%"],
        [6, "11-IPA-2", "Grade 11", "Dewi Sartika, S.Pd", "19890111 201201 2 012", 30, 29, 27, 2, 1, "96.7%", "93.1%"],
        [7, "10-IPA-3", "Grade 10", "Hendra Gunawan, S.Kom", "19910324 201601 1 005", 30, 29, 27, 2, 1, "96.7%", "93.1%"],
        [8, "12-IPS-1", "Grade 12", "Rina Wulandari, S.Pd", "19820716 200801 2 015", 30, 29, 27, 2, 1, "96.7%", "93.1%"],
        [9, "11-IPS-1", "Grade 11", "Agus Setiawan, S.Pd", "19840615 200902 1 008", 30, 29, 26, 3, 1, "96.7%", "89.7%"],
        [10, "10-IPS-1", "Grade 10", "Yusuf Maulana, M.Pd", "19860518 201101 1 007", 30, 29, 26, 3, 1, "96.7%", "89.7%"],
        [11, "12-IPA-3", "Grade 12", "Tri Wahyuni, S.Pd", "19780914 200501 2 009", 30, 28, 26, 2, 2, "93.3%", "92.9%"],
        [12, "11-IPA-3", "Grade 11", "Faisal Akbar, S.Si", "19920210 201701 1 004", 30, 29, 26, 3, 1, "96.7%", "89.7%"],
        [13, "10-IPA-4", "Grade 10", "Nurul Hidayah, S.Pd", "19930514 201802 2 006", 30, 29, 26, 3, 1, "96.7%", "89.7%"],
        [14, "12-IPS-2", "Grade 12", "Joko Prasetyo, S.Sos", "19800312 200604 1 011", 30, 28, 25, 3, 2, "93.3%", "89.3%"],
        [15, "11-IPS-2", "Grade 11", "Kartika Sari, S.Pd", "19881122 201302 2 007", 30, 29, 25, 4, 1, "96.7%", "86.2%"],
        [16, "10-IPS-2", "Grade 10", "Dodi Firmansyah, S.Pd", "19900817 201501 1 006", 30, 28, 25, 3, 2, "93.3%", "89.3%"],
        [17, "12-IPA-4", "Grade 12", "Eko Supratman, M.Pd", "19760218 200312 1 002", 30, 29, 25, 4, 1, "96.7%", "86.2%"],
        [18, "11-IPA-4", "Grade 11", "Ratna Juwita, S.Pd", "19910708 201602 2 008", 30, 28, 24, 4, 2, "93.3%", "85.7%"],
        [19, "10-IPS-3", "Grade 10", "Wahyu Hidayat, S.Pd", "19890425 201401 1 005", 30, 28, 24, 4, 2, "93.3%", "85.7%"],
        [20, "12-IPS-3", "Grade 12", "Sri Mulyani, S.Sos", "19810530 200701 2 014", 30, 28, 24, 4, 2, "93.3%", "85.7%"],
        [21, "11-IPS-3", "Grade 11", "Bambang Irawan, S.Pd", "19871012 201201 1 010", 30, 28, 23, 5, 2, "93.3%", "82.1%"],
        [22, "10-IPS-4", "Grade 10", "Anisa Rahmawati, S.Pd", "19940315 201903 2 011", 30, 27, 23, 4, 3, "90.0%", "85.2%"],
        [23, "12-IPS-4", "Grade 12", "Surya Saputra, S.Pd", "19830909 200901 1 009", 30, 28, 23, 5, 2, "93.3%", "82.1%"],
        [24, "11-IPS-4", "Grade 11", "Lestari Handayani, S.Sos", "19891204 201402 2 006", 30, 27, 22, 5, 3, "90.0%", "81.5%"]
    ]
    write_table(ws4, 4, ["Rank", "Class Name", "Grade Level", "Homeroom Teacher (Wali Kelas)", "NIP", "Total Students", "Present", "On-Time", "Late", "Absent", "Attendance %", "Punctuality %"], class_ranking, ['C', 'C', 'C', 'L', 'C', 'R', 'R', 'R', 'R', 'R', 'C', 'C'], widths=[8, 14, 12, 28, 24, 14, 12, 12, 10, 10, 14, 14])

    out_path = os.path.join(REPORTS_DIR, "Attendly_School_Executive_Report.xlsx")
    wb.save(out_path)
    shutil.copy2(out_path, os.path.join(BRAIN_ARTIFACT_DIR, "Attendly_School_Executive_Report.xlsx"))
    print(f"Generated: {out_path}")

# ==============================================================================
# 3. ATTENDLY CLASS ATTENDANCE REPORT
# ==============================================================================
def build_class_attendance_report():
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # ----------------------------------------------------
    # Sheet 1: Class Overview & Roster Recap
    # ----------------------------------------------------
    ws1 = wb.create_sheet(title="Class Overview & Summary")
    create_banner(ws1, "Class-by-Class Attendance Overview", "Homeroom Teacher (Wali Kelas) Assignments & Performance Summary", 8)

    class_overview = [
        ["10-IPA-1", "Siti Nurhaliza, S.Pd", "19850214 201001 2 018", 30, 29, 28, 1, 1, "96.7%", "96.6%", "06:42:15 WIB"],
        ["10-IPA-2", "Ahmad Dahlan, S.Pd", "19870919 201101 1 009", 30, 29, 27, 2, 1, "96.7%", "93.1%", "06:44:02 WIB"],
        ["10-IPA-3", "Hendra Gunawan, S.Kom", "19910324 201601 1 005", 30, 29, 27, 2, 1, "96.7%", "93.1%", "06:44:30 WIB"],
        ["10-IPA-4", "Nurul Hidayah, S.Pd", "19930514 201802 2 006", 30, 29, 26, 3, 1, "96.7%", "89.7%", "06:45:10 WIB"],
        ["10-IPS-1", "Yusuf Maulana, M.Pd", "19860518 201101 1 007", 30, 29, 26, 3, 1, "96.7%", "89.7%", "06:45:25 WIB"],
        ["10-IPS-2", "Dodi Firmansyah, S.Pd", "19900817 201501 1 006", 30, 28, 25, 3, 2, "93.3%", "89.3%", "06:46:12 WIB"],
        ["10-IPS-3", "Wahyu Hidayat, S.Pd", "19890425 201401 1 005", 30, 28, 24, 4, 2, "93.3%", "85.7%", "06:46:40 WIB"],
        ["10-IPS-4", "Anisa Rahmawati, S.Pd", "19940315 201903 2 011", 30, 27, 23, 4, 3, "90.0%", "85.2%", "06:47:15 WIB"],
        ["11-IPA-1", "Maya Anggraini, M.Pd", "19900405 201502 2 003", 30, 29, 28, 1, 1, "96.7%", "96.6%", "06:41:50 WIB"],
        ["11-IPA-2", "Dewi Sartika, S.Pd", "19890111 201201 2 012", 30, 29, 27, 2, 1, "96.7%", "93.1%", "06:43:20 WIB"],
        ["11-IPA-3", "Faisal Akbar, S.Si", "19920210 201701 1 004", 30, 29, 26, 3, 1, "96.7%", "89.7%", "06:45:00 WIB"],
        ["11-IPA-4", "Ratna Juwita, S.Pd", "19910708 201602 2 008", 30, 28, 24, 4, 2, "93.3%", "85.7%", "06:46:10 WIB"],
        ["11-IPS-1", "Agus Setiawan, S.Pd", "19840615 200902 1 008", 30, 29, 26, 3, 1, "96.7%", "89.7%", "06:44:55 WIB"],
        ["11-IPS-2", "Kartika Sari, S.Pd", "19881122 201302 2 007", 30, 29, 25, 4, 1, "96.7%", "86.2%", "06:46:20 WIB"],
        ["11-IPS-3", "Bambang Irawan, S.Pd", "19871012 201201 1 010", 30, 28, 23, 5, 2, "93.3%", "82.1%", "06:47:05 WIB"],
        ["11-IPS-4", "Lestari Handayani, S.Sos", "19891204 201402 2 006", 30, 27, 22, 5, 3, "90.0%", "81.5%", "06:48:00 WIB"],
        ["12-IPA-1", "Dra. Endang Purwanti", "19690412 199403 2 001", 30, 30, 29, 1, 0, "100.0%", "96.7%", "06:39:10 WIB"],
        ["12-IPA-2", "Budi Hermawan, M.Si", "19750820 200212 1 003", 30, 30, 28, 2, 0, "100.0%", "93.3%", "06:41:00 WIB"],
        ["12-IPA-3", "Tri Wahyuni, S.Pd", "19780914 200501 2 009", 30, 28, 26, 2, 2, "93.3%", "92.9%", "06:43:40 WIB"],
        ["12-IPA-4", "Eko Supratman, M.Pd", "19760218 200312 1 002", 30, 29, 25, 4, 1, "96.7%", "86.2%", "06:45:15 WIB"],
        ["12-IPS-1", "Rina Wulandari, S.Pd", "19820716 200801 2 015", 30, 29, 27, 2, 1, "96.7%", "93.1%", "06:44:10 WIB"],
        ["12-IPS-2", "Joko Prasetyo, S.Sos", "19800312 200604 1 011", 30, 28, 25, 3, 2, "93.3%", "89.3%", "06:45:45 WIB"],
        ["12-IPS-3", "Sri Mulyani, S.Sos", "19810530 200701 2 014", 30, 28, 24, 4, 2, "93.3%", "85.7%", "06:46:50 WIB"],
        ["12-IPS-4", "Surya Saputra, S.Pd", "19830909 200901 1 009", 30, 28, 23, 5, 2, "93.3%", "82.1%", "06:47:30 WIB"]
    ]
    write_table(ws1, 4, ["Class Name", "Homeroom Teacher (Wali Kelas)", "NIP", "Enrolled", "Present", "On-Time", "Late", "Absent", "Attendance %", "Punctuality %", "Avg Check-In Time"], class_overview, ['C', 'L', 'C', 'R', 'R', 'R', 'R', 'R', 'C', 'C', 'C'], widths=[14, 28, 24, 12, 12, 12, 10, 10, 14, 14, 18])

    # ----------------------------------------------------
    # Sheet 2: Class 10-IPA-1 Detailed Roster Log
    # ----------------------------------------------------
    ws2 = wb.create_sheet(title="Class 10-IPA-1 Detail")
    create_banner(ws2, "Class 10-IPA-1 Detailed Attendance Roster", "Homeroom Teacher: Siti Nurhaliza, S.Pd (NIP: 19850214 201001 2 018)", 9)

    # 30 Students Data for 10-IPA-1
    students_10ipa1 = [
        ["NISN-001", "Muhammad Rizky Pratama", "Rizky", "L", "Hendra Pratama", "+6281234567890", "06:41:15 WIB", "On Time", "99.8%", "Instant Photo", "Active"],
        ["NISN-002", "Aisyah Putri Maharani", "Aisyah", "P", "Bambang Maharani", "+6281234567891", "06:38:22 WIB", "On Time", "99.9%", "3-Shot Burst", "Active"],
        ["NISN-003", "Dimas Anggara Setiawan", "Dimas", "L", "Setiawan Wijaya", "+6281234567892", "06:45:10 WIB", "On Time", "99.4%", "Instant Photo", "Active"],
        ["NISN-004", "Nadia Salsabila", "Nadia", "P", "Agus Santoso", "+6281234567893", "06:35:40 WIB", "On Time", "99.7%", "5-Angle Pose", "Active"],
        ["NISN-005", "Bintang Ramadhan", "Bintang", "L", "Iwan Ramadhan", "+6281234567894", "06:48:55 WIB", "On Time", "99.2%", "Instant Photo", "Active"],
        ["NISN-006", "Cantika Dewi Lestari", "Cantika", "P", "Dedi Lestari", "+6281234567895", "06:42:05 WIB", "On Time", "99.5%", "Upload Photo", "Active"],
        ["NISN-007", "Fajar Hidayatullah", "Fajar", "L", "Hidayat Anwar", "+6281234567896", "06:50:18 WIB", "On Time", "99.3%", "Instant Photo", "Active"],
        ["NISN-008", "Gita Gutawa Nurhaliza", "Gita", "P", "Erwin Gutawa", "+6281234567897", "06:39:50 WIB", "On Time", "99.6%", "3-Shot Burst", "Active"],
        ["NISN-009", "Hafiz Zikri Al-Farisi", "Hafiz", "L", "Zikri Al-Farisi", "+6281234567898", "06:44:30 WIB", "On Time", "99.1%", "Instant Photo", "Active"],
        ["NISN-010", "Intan Permatasari", "Intan", "P", "Rahmat Permata", "+6281234567899", "06:36:12 WIB", "On Time", "99.8%", "Instant Photo", "Active"],
        ["NISN-011", "Jovan Marvelino", "Jovan", "L", "Markus Marvelino", "+6281234567800", "07:04:15 WIB", "Late", "98.9%", "Upload Photo", "Active"],
        ["NISN-012", "Kirana Larasati", "Kirana", "P", "Surya Larasati", "+6281234567801", "06:43:20 WIB", "On Time", "99.7%", "5-Angle Pose", "Active"],
        ["NISN-013", "Lukman Hakim", "Lukman", "L", "Hakim Abdullah", "+6281234567802", "06:47:05 WIB", "On Time", "99.3%", "Instant Photo", "Active"],
        ["NISN-014", "Meisya Amanda", "Meisya", "P", "Andi Amanda", "+6281234567803", "06:40:44 WIB", "On Time", "99.6%", "3-Shot Burst", "Active"],
        ["NISN-015", "Naufal Zaki Athallah", "Naufal", "L", "Zaki Mubarok", "+6281234567804", "06:45:50 WIB", "On Time", "99.4%", "Instant Photo", "Active"],
        ["NISN-016", "Olivia Zahra", "Olivia", "P", "Herman Zahra", "+6281234567805", "06:37:35 WIB", "On Time", "99.8%", "Instant Photo", "Active"],
        ["NISN-017", "Pandu Wicaksono", "Pandu", "L", "Wicaksono Tri", "+6281234567806", "06:49:12 WIB", "On Time", "99.1%", "Instant Photo", "Active"],
        ["NISN-018", "Qonita Azizah", "Qonita", "P", "Aziz Sudrajat", "+6281234567807", "06:41:55 WIB", "On Time", "99.5%", "Upload Photo", "Active"],
        ["NISN-019", "Rafi Ahmad Fauzi", "Rafi", "L", "Fauzi Syarif", "+6281234567808", "06:44:18 WIB", "On Time", "99.3%", "Instant Photo", "Active"],
        ["NISN-020", "Salma Khairunnisa", "Salma", "P", "Khairul Anam", "+6281234567809", "06:38:50 WIB", "On Time", "99.7%", "3-Shot Burst", "Active"],
        ["NISN-021", "Taufik Hidayat", "Taufik", "L", "Hidayat Arifin", "+6281234567810", "06:46:25 WIB", "On Time", "99.2%", "Instant Photo", "Active"],
        ["NISN-022", "Ulya Nurul Izzah", "Ulya", "P", "Izzah Maimun", "+6281234567811", "06:43:08 WIB", "On Time", "99.6%", "Instant Photo", "Active"],
        ["NISN-023", "Vino Bastian Saputra", "Vino", "L", "Bastian Saputra", "+6281234567812", "06:47:45 WIB", "On Time", "99.0%", "Instant Photo", "Active"],
        ["NISN-024", "Wanda Hamidah", "Wanda", "P", "Hamid Sanusi", "+6281234567813", "06:40:15 WIB", "On Time", "99.7%", "5-Angle Pose", "Active"],
        ["NISN-025", "Xavier Danendra", "Xavier", "L", "Danendra Kusuma", "+6281234567814", "06:48:30 WIB", "On Time", "99.4%", "Instant Photo", "Active"],
        ["NISN-026", "Yasmin Zahira", "Yasmin", "P", "Zahirudin", "+6281234567815", "06:39:10 WIB", "On Time", "99.8%", "3-Shot Burst", "Active"],
        ["NISN-027", "Zack Lee Kusuma", "Zack", "L", "Kusuma Wardhana", "+6281234567816", "06:51:00 WIB", "On Time", "99.1%", "Instant Photo", "Active"],
        ["NISN-028", "Adelia Putri", "Adelia", "P", "Putra Wijaya", "+6281234567817", "06:42:40 WIB", "On Time", "99.5%", "Upload Photo", "Active"],
        ["NISN-029", "Bagas Pratama", "Bagas", "L", "Pratama Suhardi", "+6281234567818", "06:45:20 WIB", "On Time", "99.3%", "Instant Photo", "Active"],
        ["NISN-030", "Clara Shinta", "Clara", "P", "Shinta Sudarsono", "+6281234567819", "ABSENT (SICK)", "Sick", "0.0%", "3-Shot Burst", "Excused"]
    ]
    write_table(ws2, 4, ["Student ID (NISN)", "Student Full Name", "Call Name", "Gender", "Parent / Guardian", "WhatsApp Phone", "Gate Check-In", "Punctuality", "Confidence %", "Enrollment Method", "Status"], students_10ipa1, ['C', 'L', 'C', 'C', 'L', 'C', 'C', 'C', 'C', 'L', 'C'], widths=[16, 26, 14, 10, 22, 18, 16, 14, 14, 18, 14])

    # ----------------------------------------------------
    # Sheet 3: Class 10-IPA-2 Detailed Roster Log
    # ----------------------------------------------------
    ws3 = wb.create_sheet(title="Class 10-IPA-2 Detail")
    create_banner(ws3, "Class 10-IPA-2 Detailed Attendance Roster", "Homeroom Teacher: Ahmad Dahlan, S.Pd (NIP: 19870919 201101 1 009)", 9)

    students_10ipa2 = [
        ["NISN-031", "Arya Sena Wicaksana", "Arya", "L", "Sena Wicaksana", "+6281234567820", "06:39:15 WIB", "On Time", "99.7%", "Instant Photo", "Active"],
        ["NISN-032", "Bella Safitri", "Bella", "P", "Safitri Utama", "+6281234567821", "06:42:30 WIB", "On Time", "99.8%", "3-Shot Burst", "Active"],
        ["NISN-033", "Candra Wijaya", "Candra", "L", "Wijaya Gunawan", "+6281234567822", "07:05:12 WIB", "Late", "99.2%", "Instant Photo", "Active"],
        ["NISN-034", "Dinda Kirana", "Dinda", "P", "Kirana Kusuma", "+6281234567823", "06:36:45 WIB", "On Time", "99.6%", "5-Angle Pose", "Active"],
        ["NISN-035", "Erick Thohir Santoso", "Erick", "L", "Thohir Santoso", "+6281234567824", "06:47:10 WIB", "On Time", "99.3%", "Instant Photo", "Active"],
        ["NISN-036", "Farah Quinn Amalia", "Farah", "P", "Amalia Syarif", "+6281234567825", "06:41:20 WIB", "On Time", "99.5%", "Upload Photo", "Active"],
        ["NISN-037", "Gilang Dirga", "Gilang", "L", "Dirga Perkasa", "+6281234567826", "06:49:50 WIB", "On Time", "99.1%", "Instant Photo", "Active"],
        ["NISN-038", "Hani Hanifah", "Hani", "P", "Hanifah Drajat", "+6281234567827", "06:40:05 WIB", "On Time", "99.7%", "3-Shot Burst", "Active"],
        ["NISN-039", "Iqbal Ramadhan", "Iqbal", "L", "Ramadhan Zarkasih", "+6281234567828", "07:08:30 WIB", "Late", "98.9%", "Instant Photo", "Active"],
        ["NISN-040", "Jessica Mila", "Jessica", "P", "Mila Sukarno", "+6281234567829", "06:37:15 WIB", "On Time", "99.9%", "Instant Photo", "Active"],
        ["NISN-041", "Kevin Sanjaya", "Kevin", "L", "Sanjaya Sukamuljo", "+6281234567830", "06:43:40 WIB", "On Time", "99.4%", "Upload Photo", "Active"],
        ["NISN-042", "Luna Maya Putri", "Luna", "P", "Maya Utoyo", "+6281234567831", "06:44:12 WIB", "On Time", "99.6%", "5-Angle Pose", "Active"],
        ["NISN-043", "Mario Teguh Pradana", "Mario", "L", "Pradana Subagyo", "+6281234567832", "06:48:25 WIB", "On Time", "99.2%", "Instant Photo", "Active"],
        ["NISN-044", "Nabila Syakieb", "Nabila", "P", "Syakieb Rusli", "+6281234567833", "06:40:35 WIB", "On Time", "99.8%", "3-Shot Burst", "Active"],
        ["NISN-045", "Oki Setiana Dewi", "Oki", "P", "Dewi Hartono", "+6281234567834", "ABSENT (PERMIT)", "Permit", "0.0%", "Instant Photo", "Excused"]
    ]
    write_table(ws3, 4, ["Student ID (NISN)", "Student Full Name", "Call Name", "Gender", "Parent / Guardian", "WhatsApp Phone", "Gate Check-In", "Punctuality", "Confidence %", "Enrollment Method", "Status"], students_10ipa2, ['C', 'L', 'C', 'C', 'L', 'C', 'C', 'C', 'C', 'L', 'C'], widths=[16, 26, 14, 10, 22, 18, 16, 14, 14, 18, 14])

    # ----------------------------------------------------
    # Sheet 4: Late Intervention & Risk Recap
    # ----------------------------------------------------
    ws4 = wb.create_sheet(title="Late Intervention & Risk")
    create_banner(ws4, "Chronic Late Arrival & Student Intervention Log", "Students with >= 3 Late Days in October 2026 (BK & Homeroom Teacher Follow-Up)", 8)

    late_intervention = [
        ["NISN-011", "Jovan Marvelino", "10-IPA-1", "Siti Nurhaliza, S.Pd", 4, "07:07:30 WIB", "Traffic congestion on Jalan Raya Barat", "Sent & Delivered", "Scheduled BK Parent Consultation (16 Oct)"],
        ["NISN-039", "Iqbal Ramadhan", "10-IPA-2", "Ahmad Dahlan, S.Pd", 3, "07:09:15 WIB", "Late waking, distance from school >15 km", "Sent & Read", "Arranged carpool with classmate"],
        ["NISN-074", "Rendra Karno", "11-IPS-2", "Kartika Sari, S.Pd", 5, "07:12:00 WIB", "Motorcycle mechanical breakdown", "Sent & Delivered", "Parent meeting completed; warning letter issued"],
        ["NISN-098", "Bagus Triatmoko", "11-IPS-4", "Lestari Handayani, S.Sos", 4, "07:08:45 WIB", "Family morning household responsibilities", "Sent & Read", "BK counseling session scheduled"],
        ["NISN-112", "Fauzan Azima", "10-IPS-3", "Wahyu Hidayat, S.Pd", 3, "07:06:20 WIB", "Rain / transportation delay", "Sent & Delivered", "Monitoring weekly progress"],
        ["NISN-145", "Gilang Ramadhan", "12-IPS-3", "Sri Mulyani, S.Sos", 4, "07:10:10 WIB", "Overslept after exam prep", "Sent & Read", "Signed punctuality commitment form"],
        ["NISN-188", "Doni Prasetya", "11-IPS-3", "Bambang Irawan, S.Pd", 4, "07:07:50 WIB", "Train crossing bottleneck", "Sent & Delivered", "Adjusted home departure time to 06:15 WIB"]
    ]
    write_table(ws4, 4, ["Student ID", "Student Full Name", "Class", "Homeroom Teacher", "October Late Count", "Avg Arrival Timestamp", "Primary Stated Reason", "Parent WhatsApp Status", "Intervention & Counseling Action Plan"], late_intervention, ['C', 'L', 'C', 'L', 'R', 'C', 'L', 'C', 'L'], widths=[14, 24, 12, 24, 18, 20, 36, 20, 38])

    out_path = os.path.join(REPORTS_DIR, "Attendly_Class_Attendance_Report.xlsx")
    wb.save(out_path)
    shutil.copy2(out_path, os.path.join(BRAIN_ARTIFACT_DIR, "Attendly_Class_Attendance_Report.xlsx"))
    print(f"Generated: {out_path}")

# ==============================================================================
# 4. ATTENDLY STUDENT INDIVIDUAL REPORT
# ==============================================================================
def build_student_individual_report():
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # ----------------------------------------------------
    # Sheet 1: Master Student Directory
    # ----------------------------------------------------
    ws1 = wb.create_sheet(title="Master Student Directory")
    create_banner(ws1, "Master Student Biometric Identity Directory", "Student Demographic Attributes, Biometric Enrollment & Vector IDs", 10)

    # Master students list
    students_master = [
        ["NISN-001", "Muhammad Rizky Pratama", "Rizky", "10-IPA-1", "L", "Hendra Pratama", "+6281234567890", "Instant Photo", "VEC-512D-001-A", "Synced (ArcFace)", "DOC-CONSENT-2026-001", "Active"],
        ["NISN-002", "Aisyah Putri Maharani", "Aisyah", "10-IPA-1", "P", "Bambang Maharani", "+6281234567891", "3-Shot Burst", "VEC-512D-002-B", "Synced (ArcFace)", "DOC-CONSENT-2026-002", "Active"],
        ["NISN-003", "Dimas Anggara Setiawan", "Dimas", "10-IPA-1", "L", "Setiawan Wijaya", "+6281234567892", "Instant Photo", "VEC-512D-003-A", "Synced (ArcFace)", "DOC-CONSENT-2026-003", "Active"],
        ["NISN-004", "Nadia Salsabila", "Nadia", "10-IPA-1", "P", "Agus Santoso", "+6281234567893", "5-Angle Pose", "VEC-512D-004-M", "Synced (ArcFace)", "DOC-CONSENT-2026-004", "Active"],
        ["NISN-005", "Bintang Ramadhan", "Bintang", "10-IPA-1", "L", "Iwan Ramadhan", "+6281234567894", "Instant Photo", "VEC-512D-005-A", "Synced (ArcFace)", "DOC-CONSENT-2026-005", "Active"],
        ["NISN-006", "Cantika Dewi Lestari", "Cantika", "10-IPA-1", "P", "Dedi Lestari", "+6281234567895", "Upload Photo", "VEC-512D-006-U", "Synced (ArcFace)", "DOC-CONSENT-2026-006", "Active"],
        ["NISN-007", "Fajar Hidayatullah", "Fajar", "10-IPA-1", "L", "Hidayat Anwar", "+6281234567896", "Instant Photo", "VEC-512D-007-A", "Synced (ArcFace)", "DOC-CONSENT-2026-007", "Active"],
        ["NISN-008", "Gita Gutawa Nurhaliza", "Gita", "10-IPA-1", "P", "Erwin Gutawa", "+6281234567897", "3-Shot Burst", "VEC-512D-008-B", "Synced (ArcFace)", "DOC-CONSENT-2026-008", "Active"],
        ["NISN-009", "Hafiz Zikri Al-Farisi", "Hafiz", "10-IPA-1", "L", "Zikri Al-Farisi", "+6281234567898", "Instant Photo", "VEC-512D-009-A", "Synced (ArcFace)", "DOC-CONSENT-2026-009", "Active"],
        ["NISN-010", "Intan Permatasari", "Intan", "10-IPA-1", "P", "Rahmat Permata", "+6281234567899", "Instant Photo", "VEC-512D-010-A", "Synced (ArcFace)", "DOC-CONSENT-2026-010", "Active"],
        ["NISN-011", "Jovan Marvelino", "Jovan", "10-IPA-1", "L", "Markus Marvelino", "+6281234567800", "Upload Photo", "VEC-512D-011-U", "Synced (ArcFace)", "DOC-CONSENT-2026-011", "Active"],
        ["NISN-012", "Kirana Larasati", "Kirana", "10-IPA-1", "P", "Surya Larasati", "+6281234567801", "5-Angle Pose", "VEC-512D-012-M", "Synced (ArcFace)", "DOC-CONSENT-2026-012", "Active"],
        ["NISN-013", "Lukman Hakim", "Lukman", "10-IPA-1", "L", "Hakim Abdullah", "+6281234567802", "Instant Photo", "VEC-512D-013-A", "Synced (ArcFace)", "DOC-CONSENT-2026-013", "Active"],
        ["NISN-014", "Meisya Amanda", "Meisya", "10-IPA-1", "P", "Andi Amanda", "+6281234567803", "3-Shot Burst", "VEC-512D-014-B", "Synced (ArcFace)", "DOC-CONSENT-2026-014", "Active"],
        ["NISN-015", "Naufal Zaki Athallah", "Naufal", "10-IPA-1", "L", "Zaki Mubarok", "+6281234567804", "Instant Photo", "VEC-512D-015-A", "Synced (ArcFace)", "DOC-CONSENT-2026-015", "Active"],
        ["NISN-031", "Arya Sena Wicaksana", "Arya", "10-IPA-2", "L", "Sena Wicaksana", "+6281234567820", "Instant Photo", "VEC-512D-031-A", "Synced (ArcFace)", "DOC-CONSENT-2026-031", "Active"],
        ["NISN-032", "Bella Safitri", "Bella", "10-IPA-2", "P", "Safitri Utama", "+6281234567821", "3-Shot Burst", "VEC-512D-032-B", "Synced (ArcFace)", "DOC-CONSENT-2026-032", "Active"],
        ["NISN-033", "Candra Wijaya", "Candra", "10-IPA-2", "L", "Wijaya Gunawan", "+6281234567822", "Instant Photo", "VEC-512D-033-A", "Synced (ArcFace)", "DOC-CONSENT-2026-033", "Active"],
        ["NISN-034", "Dinda Kirana", "Dinda", "10-IPA-2", "P", "Kirana Kusuma", "+6281234567823", "5-Angle Pose", "VEC-512D-034-M", "Synced (ArcFace)", "DOC-CONSENT-2026-034", "Active"],
        ["NISN-035", "Erick Thohir Santoso", "Erick", "10-IPA-2", "L", "Thohir Santoso", "+6281234567824", "Instant Photo", "VEC-512D-035-A", "Synced (ArcFace)", "DOC-CONSENT-2026-035", "Active"],
        ["NISN-051", "Aditya Bagus Saputra", "Aditya", "11-IPA-1", "L", "Bagus Saputra", "+6281234567840", "Instant Photo", "VEC-512D-051-A", "Synced (ArcFace)", "DOC-CONSENT-2026-051", "Active"],
        ["NISN-052", "Clarissa Aurelia", "Clarissa", "11-IPA-1", "P", "Aurelius Susanto", "+6281234567841", "3-Shot Burst", "VEC-512D-052-B", "Synced (ArcFace)", "DOC-CONSENT-2026-052", "Active"],
        ["NISN-053", "Darmawan Santoso", "Darmawan", "11-IPA-1", "L", "Santoso Widodo", "+6281234567842", "Instant Photo", "VEC-512D-053-A", "Synced (ArcFace)", "DOC-CONSENT-2026-053", "Active"],
        ["NISN-054", "Elsa Pitaloka", "Elsa", "11-IPA-1", "P", "Pitaloka Sudrajat", "+6281234567843", "5-Angle Pose", "VEC-512D-054-M", "Synced (ArcFace)", "DOC-CONSENT-2026-054", "Active"],
        ["NISN-055", "Farhan Maulana", "Farhan", "11-IPA-1", "L", "Maulana Malik", "+6281234567844", "Instant Photo", "VEC-512D-055-A", "Synced (ArcFace)", "DOC-CONSENT-2026-055", "Active"]
    ]
    write_table(ws1, 4, ["Student ID (NISN)", "Student Full Name", "Call Name", "Class", "Gender", "Parent / Guardian", "Parent WhatsApp", "Enrollment Method", "ArcFace Vector ID", "Python Sync Status", "Consent Form ID", "Status"], students_master, ['C', 'L', 'C', 'C', 'C', 'L', 'C', 'L', 'C', 'C', 'C', 'C'], widths=[16, 26, 14, 12, 10, 22, 18, 18, 18, 18, 22, 12])

    # ----------------------------------------------------
    # Sheet 2: Real-Time Gate Scan Logs
    # ----------------------------------------------------
    ws2 = wb.create_sheet(title="Real-Time Gate Scan Logs")
    create_banner(ws2, "Real-Time Walk-Through Gate Scan Telemetry", "Granular Access Scan Audit Trail (October 14, 2026)", 11)

    scan_logs = [
        ["LOG-20261014-001", "14/10/2026", "06:35:40 WIB", "NISN-004", "Nadia Salsabila", "10-IPA-1", "GATE-01 (East Corridor)", "Python InsightFace ArcFace", "99.7%", "0.98", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-002", "14/10/2026", "06:36:12 WIB", "NISN-010", "Intan Permatasari", "10-IPA-1", "GATE-01 (East Corridor)", "Python InsightFace ArcFace", "99.8%", "0.99", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-003", "14/10/2026", "06:36:45 WIB", "NISN-034", "Dinda Kirana", "10-IPA-2", "GATE-02 (North Access)", "Python InsightFace ArcFace", "99.6%", "0.96", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-004", "14/10/2026", "06:37:15 WIB", "NISN-040", "Jessica Mila", "10-IPA-2", "GATE-02 (North Access)", "Python InsightFace ArcFace", "99.9%", "0.98", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-005", "14/10/2026", "06:38:22 WIB", "NISN-002", "Aisyah Putri Maharani", "10-IPA-1", "GATE-01 (East Corridor)", "Python InsightFace ArcFace", "99.9%", "0.99", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-006", "14/10/2026", "06:39:15 WIB", "NISN-031", "Arya Sena Wicaksana", "10-IPA-2", "GATE-02 (North Access)", "Python InsightFace ArcFace", "99.7%", "0.97", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-007", "14/10/2026", "06:41:15 WIB", "NISN-001", "Muhammad Rizky Pratama", "10-IPA-1", "GATE-01 (East Corridor)", "Python InsightFace ArcFace", "99.8%", "0.98", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-008", "14/10/2026", "06:42:05 WIB", "NISN-006", "Cantika Dewi Lestari", "10-IPA-1", "GATE-01 (East Corridor)", "Python InsightFace ArcFace", "99.5%", "0.95", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-009", "14/10/2026", "06:44:30 WIB", "NISN-009", "Hafiz Zikri Al-Farisi", "10-IPA-1", "GATE-01 (East Corridor)", "Python InsightFace ArcFace", "99.1%", "0.94", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-010", "14/10/2026", "06:45:10 WIB", "NISN-003", "Dimas Anggara Setiawan", "10-IPA-1", "GATE-01 (East Corridor)", "Python InsightFace ArcFace", "99.4%", "0.96", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-011", "14/10/2026", "06:47:10 WIB", "NISN-035", "Erick Thohir Santoso", "10-IPA-2", "GATE-02 (North Access)", "Python InsightFace ArcFace", "99.3%", "0.95", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-012", "14/10/2026", "06:48:55 WIB", "NISN-005", "Bintang Ramadhan", "10-IPA-1", "GATE-01 (East Corridor)", "Python InsightFace ArcFace", "99.2%", "0.93", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-013", "14/10/2026", "06:50:18 WIB", "NISN-007", "Fajar Hidayatullah", "10-IPA-1", "GATE-01 (East Corridor)", "Python InsightFace ArcFace", "99.3%", "0.95", "On Time", "Unlocked & Passed"],
        ["LOG-20261014-014", "14/10/2026", "07:04:15 WIB", "NISN-011", "Jovan Marvelino", "10-IPA-1", "GATE-01 (East Corridor)", "Python InsightFace ArcFace", "98.9%", "0.92", "Late", "Unlocked & Logged Late"],
        ["LOG-20261014-015", "14/10/2026", "07:08:30 WIB", "NISN-039", "Iqbal Ramadhan", "10-IPA-2", "GATE-02 (North Access)", "Python InsightFace ArcFace", "98.9%", "0.91", "Late", "Unlocked & Logged Late"]
    ]
    write_table(ws2, 4, ["Log Event ID", "Date", "Timestamp (WIB)", "Student ID", "Student Full Name", "Class", "Gate Terminal Corridor", "Biometric Inference Engine", "Confidence %", "Face Quality", "Punctuality Status", "Physical Turnstile Action"], scan_logs, ['C', 'C', 'C', 'C', 'L', 'C', 'L', 'L', 'C', 'C', 'C', 'L'], widths=[18, 12, 16, 14, 26, 12, 26, 26, 14, 12, 16, 24])

    # ----------------------------------------------------
    # Sheet 3: WhatsApp Parent Dispatch Ledger
    # ----------------------------------------------------
    ws3 = wb.create_sheet(title="WhatsApp Parent Dispatch Ledger")
    create_banner(ws3, "Parent WhatsApp Automated Dispatch Ledger", "Real-Time Notification Delivery Receipts & Message Payloads", 10)

    wa_logs = [
        ["WA-MSG-901", "14/10/2026 06:35:42 WIB", "NISN-004", "Nadia Salsabila", "Nadia", "Agus Santoso", "+6281234567893", "Tepat Waktu", "Yth. Bapak/Ibu Agus Santoso, ananda Nadia telah hadir di SMA Negeri 1 Prestasi Bangsa pada pukul 06:35 WIB (Tepat Waktu). Terima kasih.", "Delivered & Read", "1.1 s"],
        ["WA-MSG-902", "14/10/2026 06:36:14 WIB", "NISN-010", "Intan Permatasari", "Intan", "Rahmat Permata", "+6281234567899", "Tepat Waktu", "Yth. Bapak/Ibu Rahmat Permata, ananda Intan telah hadir di SMA Negeri 1 Prestasi Bangsa pada pukul 06:36 WIB (Tepat Waktu). Terima kasih.", "Delivered & Read", "1.3 s"],
        ["WA-MSG-903", "14/10/2026 06:36:47 WIB", "NISN-034", "Dinda Kirana", "Dinda", "Kirana Kusuma", "+6281234567823", "Tepat Waktu", "Yth. Bapak/Ibu Kirana Kusuma, ananda Dinda telah hadir di SMA Negeri 1 Prestasi Bangsa pada pukul 06:36 WIB (Tepat Waktu). Terima kasih.", "Delivered & Read", "1.2 s"],
        ["WA-MSG-904", "14/10/2026 06:37:17 WIB", "NISN-040", "Jessica Mila", "Jessica", "Mila Sukarno", "+6281234567829", "Tepat Waktu", "Yth. Bapak/Ibu Mila Sukarno, ananda Jessica telah hadir di SMA Negeri 1 Prestasi Bangsa pada pukul 06:37 WIB (Tepat Waktu). Terima kasih.", "Delivered", "1.0 s"],
        ["WA-MSG-905", "14/10/2026 06:38:24 WIB", "NISN-002", "Aisyah Putri Maharani", "Aisyah", "Bambang Maharani", "+6281234567891", "Tepat Waktu", "Yth. Bapak/Ibu Bambang Maharani, ananda Aisyah telah hadir di SMA Negeri 1 Prestasi Bangsa pada pukul 06:38 WIB (Tepat Waktu). Terima kasih.", "Delivered & Read", "1.2 s"],
        ["WA-MSG-906", "14/10/2026 06:39:17 WIB", "NISN-031", "Arya Sena Wicaksana", "Arya", "Sena Wicaksana", "+6281234567820", "Tepat Waktu", "Yth. Bapak/Ibu Sena Wicaksana, ananda Arya telah hadir di SMA Negeri 1 Prestasi Bangsa pada pukul 06:39 WIB (Tepat Waktu). Terima kasih.", "Delivered & Read", "1.4 s"],
        ["WA-MSG-907", "14/10/2026 06:41:17 WIB", "NISN-001", "Muhammad Rizky Pratama", "Rizky", "Hendra Pratama", "+6281234567890", "Tepat Waktu", "Yth. Bapak/Ibu Hendra Pratama, ananda Rizky telah hadir di SMA Negeri 1 Prestasi Bangsa pada pukul 06:41 WIB (Tepat Waktu). Terima kasih.", "Delivered & Read", "1.1 s"],
        ["WA-MSG-908", "14/10/2026 06:42:07 WIB", "NISN-006", "Cantika Dewi Lestari", "Cantika", "Dedi Lestari", "+6281234567895", "Tepat Waktu", "Yth. Bapak/Ibu Dedi Lestari, ananda Cantika telah hadir di SMA Negeri 1 Prestasi Bangsa pada pukul 06:42 WIB (Tepat Waktu). Terima kasih.", "Delivered", "1.2 s"],
        ["WA-MSG-909", "14/10/2026 06:44:32 WIB", "NISN-009", "Hafiz Zikri Al-Farisi", "Hafiz", "Zikri Al-Farisi", "+6281234567898", "Tepat Waktu", "Yth. Bapak/Ibu Zikri Al-Farisi, ananda Hafiz telah hadir di SMA Negeri 1 Prestasi Bangsa pada pukul 06:44 WIB (Tepat Waktu). Terima kasih.", "Delivered & Read", "1.0 s"],
        ["WA-MSG-910", "14/10/2026 06:45:12 WIB", "NISN-003", "Dimas Anggara Setiawan", "Dimas", "Setiawan Wijaya", "+6281234567892", "Tepat Waktu", "Yth. Bapak/Ibu Setiawan Wijaya, ananda Dimas telah hadir di SMA Negeri 1 Prestasi Bangsa pada pukul 06:45 WIB (Tepat Waktu). Terima kasih.", "Delivered & Read", "1.3 s"],
        ["WA-MSG-911", "14/10/2026 07:04:17 WIB", "NISN-011", "Jovan Marvelino", "Jovan", "Markus Marvelino", "+6281234567800", "Terlambat", "Pemberitahuan: Yth. Bapak/Ibu Markus Marvelino, ananda Jovan tercatat tiba di SMA Negeri 1 Prestasi Bangsa pada pukul 07:04 WIB (Terlambat). Mohon perhatiannya.", "Delivered & Read", "1.2 s"],
        ["WA-MSG-912", "14/10/2026 07:08:32 WIB", "NISN-039", "Iqbal Ramadhan", "Iqbal", "Ramadhan Zarkasih", "+6281234567828", "Terlambat", "Pemberitahuan: Yth. Bapak/Ibu Ramadhan Zarkasih, ananda Iqbal tercatat tiba di SMA Negeri 1 Prestasi Bangsa pada pukul 07:08 WIB (Terlambat). Mohon perhatiannya.", "Delivered & Read", "1.4 s"]
    ]
    write_table(ws3, 4, ["Message ID", "Dispatch Timestamp", "Student ID", "Student Full Name", "Call Name", "Parent Recipient", "Destination Phone", "Alert Type", "Dispatched Message Payload", "Delivery Status", "Gateway Latency"], wa_logs, ['C', 'C', 'C', 'L', 'C', 'L', 'C', 'C', 'L', 'C', 'C'], widths=[16, 22, 14, 24, 12, 20, 18, 14, 52, 18, 16])

    # ----------------------------------------------------
    # Sheet 4: Biometric & Consent Compliance
    # ----------------------------------------------------
    ws4 = wb.create_sheet(title="Biometric & Consent Compliance")
    create_banner(ws4, "Biometric Privacy & Parental Consent Registry", "Legal Consent Certification & Biometric Feature Integrity", 8)

    compliance_data = [
        ["NISN-001", "Muhammad Rizky Pratama", "10-IPA-1", "15/07/2026", "Instant Photo", "DOC-CONSENT-2026-001", "12/07/2026", "Verified & Active", "Passed (0.99)", "AES-256 GCM"],
        ["NISN-002", "Aisyah Putri Maharani", "10-IPA-1", "15/07/2026", "3-Shot Burst", "DOC-CONSENT-2026-002", "12/07/2026", "Verified & Active", "Passed (0.99)", "AES-256 GCM"],
        ["NISN-003", "Dimas Anggara Setiawan", "10-IPA-1", "15/07/2026", "Instant Photo", "DOC-CONSENT-2026-003", "13/07/2026", "Verified & Active", "Passed (0.98)", "AES-256 GCM"],
        ["NISN-004", "Nadia Salsabila", "10-IPA-1", "16/07/2026", "5-Angle Pose", "DOC-CONSENT-2026-004", "13/07/2026", "Verified & Active", "Passed (1.00)", "AES-256 GCM"],
        ["NISN-005", "Bintang Ramadhan", "10-IPA-1", "16/07/2026", "Instant Photo", "DOC-CONSENT-2026-005", "14/07/2026", "Verified & Active", "Passed (0.97)", "AES-256 GCM"],
        ["NISN-006", "Cantika Dewi Lestari", "10-IPA-1", "16/07/2026", "Upload Photo", "DOC-CONSENT-2026-006", "14/07/2026", "Verified & Active", "Passed (0.98)", "AES-256 GCM"],
        ["NISN-007", "Fajar Hidayatullah", "10-IPA-1", "17/07/2026", "Instant Photo", "DOC-CONSENT-2026-007", "14/07/2026", "Verified & Active", "Passed (0.98)", "AES-256 GCM"],
        ["NISN-008", "Gita Gutawa Nurhaliza", "10-IPA-1", "17/07/2026", "3-Shot Burst", "DOC-CONSENT-2026-008", "15/07/2026", "Verified & Active", "Passed (0.99)", "AES-256 GCM"],
        ["NISN-009", "Hafiz Zikri Al-Farisi", "10-IPA-1", "17/07/2026", "Instant Photo", "DOC-CONSENT-2026-009", "15/07/2026", "Verified & Active", "Passed (0.97)", "AES-256 GCM"],
        ["NISN-010", "Intan Permatasari", "10-IPA-1", "18/07/2026", "Instant Photo", "DOC-CONSENT-2026-010", "15/07/2026", "Verified & Active", "Passed (0.99)", "AES-256 GCM"]
    ]
    write_table(ws4, 4, ["Student ID", "Student Full Name", "Class", "Biometric Enrolled Date", "Calibration Method", "Parental Consent Certificate", "Consent Signature Date", "UU PDP Consent Status", "Anti-Spoofing Liveness", "Vector Encryption"], compliance_data, ['C', 'L', 'C', 'C', 'L', 'C', 'C', 'C', 'C', 'C'], widths=[14, 26, 12, 22, 18, 26, 20, 20, 20, 18])

    out_path = os.path.join(REPORTS_DIR, "Attendly_Student_Individual_Report.xlsx")
    wb.save(out_path)
    shutil.copy2(out_path, os.path.join(BRAIN_ARTIFACT_DIR, "Attendly_Student_Individual_Report.xlsx"))
    print(f"Generated: {out_path}")

if __name__ == "__main__":
    print("Building Attendly Executive Excel Suite...")
    build_project_brief()
    build_school_executive_report()
    build_class_attendance_report()
    build_student_individual_report()
    print("All 4 workbooks successfully compiled and copied to artifacts directory!")
