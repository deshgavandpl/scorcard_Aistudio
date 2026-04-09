import { jsPDF } from 'jspdf';

export const generateUserGuidePDF = async () => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const brandRed = [220, 38, 38]; // #dc2626
  const slate900 = [15, 23, 42];
  const slate600 = [71, 85, 105];
  const slate100 = [241, 245, 249];

  // Helper for drawing rounded rects
  const roundedRect = (x: number, y: number, w: number, h: number, r: number, fill: boolean = false) => {
    doc.roundedRect(x, y, w, h, r, r, fill ? 'F' : 'S');
  };

  // --- PAGE 1: COVER ---
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(0, 0, 210, 297, 'F');

  // Logo
  doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
  roundedRect(85, 40, 40, 40, 8, true);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(60);
  doc.text('A', 105, 72, { align: 'center' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(48);
  doc.text('APNA CRICKET', 105, 110, { align: 'center' });
  
  doc.setFontSize(24);
  doc.setTextColor(200, 200, 200);
  doc.text('OFFICIAL USER GUIDE', 105, 125, { align: 'center' });

  // Footer info
  doc.setFontSize(12);
  doc.text('Managed by Avinash Huse', 105, 260, { align: 'center' });
  doc.text('apnacricket.co.in', 105, 270, { align: 'center' });

  // --- PAGE 2: USER FLOWCHART ---
  doc.addPage();
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFontSize(24);
  doc.text('SYSTEM WORKFLOW', 20, 25);
  doc.setDrawColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.setLineWidth(1);
  doc.line(20, 30, 60, 30);

  // Flowchart drawing
  const drawBox = (x: number, y: number, text: string, color: number[] = brandRed) => {
    doc.setFillColor(color[0], color[1], color[2]);
    roundedRect(x, y, 50, 15, 3, true);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(text, x + 25, y + 9, { align: 'center' });
  };

  const drawArrow = (x1: number, y1: number, x2: number, y2: number) => {
    doc.setDrawColor(slate600[0], slate600[1], slate600[2]);
    doc.setLineWidth(0.5);
    doc.line(x1, y1, x2, y2);
    // Simple arrow head
    doc.line(x2, y2, x2 - 2, y2 - 2);
    doc.line(x2, y2, x2 + 2, y2 - 2);
  };

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('ADMIN FLOW', 20, 50);
  
  drawBox(20, 60, 'LOGIN (ADMIN ID/PIN)');
  drawArrow(45, 75, 45, 85);
  drawBox(20, 85, 'CREATE TOURNAMENT');
  drawArrow(45, 100, 45, 110);
  drawBox(20, 110, 'ADD TEAMS & PLAYERS');
  drawArrow(45, 125, 45, 135);
  drawBox(20, 135, 'SCHEDULE FIXTURES');
  drawArrow(45, 150, 45, 160);
  drawBox(20, 160, 'START LIVE SCORING');

  doc.text('FAN / USER FLOW', 120, 50);
  drawBox(120, 60, 'VISIT HOME PAGE', slate900);
  drawArrow(145, 75, 145, 85);
  drawBox(120, 85, 'VIEW LIVE SCORES', slate900);
  drawArrow(145, 100, 145, 110);
  drawBox(120, 110, 'JOIN LIVE CHAT', slate900);
  drawArrow(145, 125, 145, 135);
  drawBox(120, 135, 'CHECK STATS & TABLE', slate900);

  // --- PAGE 3: ADMIN GUIDE ---
  doc.addPage();
  doc.setFontSize(24);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('ADMINISTRATOR GUIDE', 20, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const adminSteps = [
    '1. Accessing Admin Mode: Click the "Admin" button in the top right. Use your secure credentials to unlock the management dashboard.',
    '2. Tournament Management: Create new tournaments by defining the name and adding teams. You can manage multiple tournaments simultaneously.',
    '3. Team Setup: Add players to each team. Ensure player names are correct as they will be used for individual statistics.',
    '4. Match Scheduling: In the tournament detail view, use "Add Stage Match" to create fixtures. You can set overs and match types.',
    '5. Live Scoring: This is the core feature. Resume any upcoming match to start scoring. You control the toss, opening players, and every ball recorded.',
    '6. Settings: Use the Settings page to manage social links and send global announcements to all users.'
  ];

  let yPos = 40;
  adminSteps.forEach(step => {
    const lines = doc.splitTextToSize(step, 170);
    doc.text(lines, 20, yPos);
    yPos += (lines.length * 7) + 5;
  });

  // Security Note
  doc.setFillColor(254, 242, 242);
  roundedRect(20, yPos, 170, 20, 2, true);
  doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('SECURITY NOTICE:', 25, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Never share your Admin PIN with anyone. The system will never ask for your PIN via email or chat.', 25, yPos + 14);

  // --- PAGE 4: USER GUIDE ---
  doc.addPage();
  doc.setFontSize(24);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('USER & FAN GUIDE', 20, 25);

  const userSteps = [
    '1. Live Scores: The home page and "Live Score" tab show ongoing matches in real-time. Scores update automatically without refreshing.',
    '2. Match Details: Click on any match to see the full scorecard, including individual batting and bowling figures.',
    '3. Live Chat: Engage with other fans during the match. The chat is moderated and shows the most recent messages.',
    '4. Statistics: Visit the "Stats" page to see tournament leaders, highest scorers, and the current points table.',
    '5. Announcements: Keep an eye out for real-time popups from the admin regarding match updates or schedule changes.'
  ];

  yPos = 40;
  userSteps.forEach(step => {
    const lines = doc.splitTextToSize(step, 170);
    doc.text(lines, 20, yPos);
    yPos += (lines.length * 7) + 5;
  });

  // Final Footer
  doc.setFontSize(10);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('© 2026 Apna Cricket System - Powering Rural Cricket', 105, 285, { align: 'center' });

  doc.save('Apna_Cricket_User_Guide.pdf');
};
