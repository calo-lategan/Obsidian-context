import fitz
import sys

# Set stdout/stderr to UTF-8
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def translate_density(input_path, output_path):
    doc = fitz.open(input_path)
    
    # ----------------------------------------------------
    # PAGE 1 (Cover)
    # ----------------------------------------------------
    page1 = doc[0]
    p1_redactions = [
        # "TEST REPORT" title - original is 检测报告
        (fitz.Rect(130.0, 170.0, 460.0, 225.0), "TEST REPORT", 38, "Times-Bold", fitz.TEXT_ALIGN_CENTER),
        # "Report No.:" label - original is 报告编号：
        (fitz.Rect(180.0, 260.0, 270.0, 285.0), "Report No.:", 14, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        
        # Table labels and values
        (fitz.Rect(100.0, 355.0, 240.0, 382.0), "Client:", 14, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(240.0, 355.0, 520.0, 382.0), "Taishi Energy Saving Materials Co., Ltd.", 14, "Times-Roman", fitz.TEXT_ALIGN_LEFT),
        
        (fitz.Rect(100.0, 422.0, 240.0, 448.0), "Sample Name:", 14, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(240.0, 422.0, 520.0, 448.0), "Rock wool board for building curtain wall", 14, "Times-Roman", fitz.TEXT_ALIGN_LEFT),
        
        (fitz.Rect(100.0, 488.0, 240.0, 514.0), "Test Category:", 14, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(240.0, 488.0, 520.0, 514.0), "Type Test", 14, "Times-Roman", fitz.TEXT_ALIGN_LEFT),
        
        # Bottom company info
        (fitz.Rect(100.0, 610.0, 500.0, 642.0), "China Building Material Test & Certification Group Co., Ltd.", 14, "Times-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(100.0, 642.0, 500.0, 675.0), "National Center for Quality Supervision and Test of Building Materials", 11.5, "Times-Bold", fitz.TEXT_ALIGN_CENTER),
    ]
    
    for rect, text, size, font, align in p1_redactions:
        page1.add_redact_annot(rect, fill=(1, 1, 1))
    page1.apply_redactions()
    for rect, text, size, font, align in p1_redactions:
        page1.insert_textbox(rect, text, fontsize=size, fontname=font, align=align, color=(0,0,0))
        
    # ----------------------------------------------------
    # PAGE 2 (Important Notes & Contact)
    # Exact coords from inspection:
    #   Title 注意事项: [239.3, 83.5, 327.6, 105.5]
    #   Item 1 starts: [56.7, 150.4 ...] ends at ~163
    #   Item 2 starts: [56.7, 181.6 ...] ends at ~195
    #   Item 3 starts: [56.7, 212.8 ...] ends at ~226
    #   Item 4 starts: [56.7, 244.0 ...] ends at ~257
    #   Item 5 starts: [56.7, 275.2 ...] ends at ~319
    #   Item 6 starts: [56.7, 337.6 ...] ends at ~382
    #   Contact label: [56.7, 467.8 ...] ends at ~480
    #   Address: [56.7, 499.0 ...] ends at ~512
    #   Website: [56.7, 530.2 ...] ends at ~543
    #   Online: [56.7, 561.4 ...] ends at ~574
    #   Tel: [56.7, 592.6 ...] ends at ~606
    #   Email: [56.7, 623.8 ...] ends at ~637
    #   Complaint: [56.7, 655.0 ...] ends at ~668
    # ----------------------------------------------------
    page2 = doc[1]
    p2_redactions = [
        # Title
        (fitz.Rect(200.0, 78.0, 370.0, 110.0), "Important Notes", 22, "Times-Bold", fitz.TEXT_ALIGN_CENTER),
        # Item 1
        (fitz.Rect(55.0, 145.0, 520.0, 168.0), "1. This report is invalid without the \"Special Stamp for Testing\" and the paging seal.", 12, "Times-Roman", fitz.TEXT_ALIGN_LEFT),
        # Item 2
        (fitz.Rect(55.0, 176.0, 520.0, 199.0), "2. This report is invalid without the signatures of \"Prepared, Reviewed, Approved\".", 12, "Times-Roman", fitz.TEXT_ALIGN_LEFT),
        # Item 3
        (fitz.Rect(55.0, 207.0, 520.0, 230.0), "3. This report is invalid if altered or partially copied.", 12, "Times-Roman", fitz.TEXT_ALIGN_LEFT),
        # Item 4
        (fitz.Rect(55.0, 238.0, 520.0, 262.0), "4. Any objection to this report shall be submitted within 15 days from the date of receipt.", 12, "Times-Roman", fitz.TEXT_ALIGN_LEFT),
        # Item 5 (spans two lines)
        (fitz.Rect(55.0, 269.0, 520.0, 325.0), "5. The entrusted test sample and information are provided by the client, and the institution is not responsible for their authenticity. The test results are only responsible for the received sample.", 12, "Times-Roman", fitz.TEXT_ALIGN_LEFT),
        # Item 6 (spans two lines)
        (fitz.Rect(55.0, 331.0, 520.0, 390.0), "6. This report uses anti-counterfeiting paper. After photocopying, it should have a grid background pattern. The numbers on the back of the data pages are random numbers and have nothing to do with the report content.", 12, "Times-Roman", fitz.TEXT_ALIGN_LEFT),
        
        # Contact section
        (fitz.Rect(55.0, 462.0, 300.0, 485.0), "Contact Information of the Institution:", 12, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(55.0, 493.0, 520.0, 517.0), "Address: No.1 Guanzhuang Dongli, Chaoyang District, Beijing   Postcode: 100024", 12, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(55.0, 524.0, 520.0, 548.0), "Website: www.ctc.ac.cn", 12, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(55.0, 555.0, 520.0, 579.0), "Customer Online Service Platform: http://www.ctc-online.cn", 12, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(55.0, 586.0, 520.0, 611.0), "Business Reception Tel: 400-010-0010, 010-51167681", 12, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(55.0, 618.0, 520.0, 642.0), "Business Reception Email: ywjd@ctc.ac.cn", 12, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(55.0, 649.0, 520.0, 673.0), "Verification & Complaint Tel: 400-010-0010, 010-51167679", 12, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
    ]
    for rect, text, size, font, align in p2_redactions:
        page2.add_redact_annot(rect, fill=(1, 1, 1))
    page2.apply_redactions()
    for rect, text, size, font, align in p2_redactions:
        page2.insert_textbox(rect, text, fontsize=size, fontname=font, align=align, color=(0,0,0))

    # ----------------------------------------------------
    # PAGE 3 (Report Metadata Table)
    # ----------------------------------------------------
    page3 = doc[2]
    
    # Top headers
    p3_headers = [
        (fitz.Rect(130.0, 30.0, 490.0, 58.0), "China Building Material Test & Certification Group Co., Ltd.", 14, "Times-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(160.0, 58.0, 460.0, 85.0), "National Center for Quality Supervision and Test of Building Materials", 10, "Times-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(230.0, 87.0, 390.0, 115.0), "TEST REPORT", 20, "Times-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(85.0, 115.0, 170.0, 135.0), "Report No.:", 10, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(440.0, 115.0, 545.0, 135.0), "Page 1 of 3", 10, "Times-Roman", fitz.TEXT_ALIGN_RIGHT),
    ]
    
    # Table grid cells
    p3_cells = [
        # Row 1
        (fitz.Rect(86.0, 140.0, 168.0, 175.0), "Sample Name", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 140.0, 363.0, 175.0), "Rock wool board for\nbuilding curtain wall", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(363.0, 140.0, 420.0, 175.0), "Test\nCategory", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(420.0, 140.0, 539.0, 175.0), "Type Test", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 2
        (fitz.Rect(86.0, 175.0, 168.0, 205.0), "Client", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 175.0, 363.0, 205.0), "Taishi Energy Saving\nMaterials Co., Ltd.", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(363.0, 175.0, 420.0, 205.0), "Sample\nSource", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(420.0, 175.0, 539.0, 205.0), "Entrusted sampling", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 3
        (fitz.Rect(86.0, 205.0, 168.0, 235.0), "Inspected\nUnit", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 205.0, 363.0, 235.0), "Taishi Energy Saving\nMaterials Co., Ltd.", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(363.0, 205.0, 420.0, 235.0), "Trademark", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(420.0, 205.0, 539.0, 235.0), "Yueru", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 4
        (fitz.Rect(86.0, 235.0, 168.0, 265.0), "Manufacturer", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 235.0, 363.0, 265.0), "Taishi Energy Saving\nMaterials Co., Ltd.", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(363.0, 235.0, 420.0, 265.0), "Sample\nStatus", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(420.0, 235.0, 539.0, 265.0), "Meets testing\nrequirements", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 5
        (fitz.Rect(86.0, 265.0, 168.0, 295.0), "Sampling\nUnit", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 265.0, 363.0, 295.0), "China Building Material Test &\nCertification Group Co., Ltd.", 8.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(363.0, 265.0, 420.0, 295.0), "Model/\nSpec.", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(420.0, 265.0, 539.0, 295.0), "1200mm x 600mm x\n100mm - 100kg/m3", 8.5, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 6
        (fitz.Rect(86.0, 295.0, 168.0, 322.0), "Date of Mfg.", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 295.0, 363.0, 322.0), "May 31, 2025", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(363.0, 295.0, 420.0, 322.0), "Sampling\nBatch", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(420.0, 295.0, 539.0, 322.0), "1500 m2", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 7
        (fitz.Rect(86.0, 322.0, 168.0, 349.0), "Sampling\nDate", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 322.0, 363.0, 349.0), "June 10, 2025", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(363.0, 322.0, 420.0, 349.0), "Sampling\nQty.", 9.5, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(420.0, 322.0, 539.0, 349.0), "6 pieces", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 8
        (fitz.Rect(86.0, 349.0, 168.0, 376.0), "Receipt\nDate", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 349.0, 363.0, 376.0), "June 13, 2025", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(363.0, 349.0, 420.0, 376.0), "Sampler", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(420.0, 349.0, 539.0, 376.0), "He Xiaoqiang,\nLiu Deyu", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 9
        (fitz.Rect(86.0, 376.0, 168.0, 403.0), "Sampling\nMethod", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 376.0, 363.0, 403.0), "Random sampling", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(363.0, 376.0, 420.0, 403.0), "Sample\nSealer", 9.5, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(420.0, 376.0, 539.0, 403.0), "Tang Jun'an,\nMao Wei", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 10
        (fitz.Rect(86.0, 403.0, 168.0, 430.0), "Sampling\nLocation", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 403.0, 363.0, 430.0), "Taishi Materials Warehouse", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(363.0, 403.0, 420.0, 430.0), "Sealing\nStatus", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(420.0, 403.0, 539.0, 430.0), "Seal intact", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 11
        (fitz.Rect(86.0, 430.0, 168.0, 458.0), "Testing\nStandards", 9.5, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 430.0, 363.0, 458.0), "See data pages for details.", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(363.0, 430.0, 420.0, 458.0), "Testing\nDate", 9.5, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(420.0, 430.0, 539.0, 458.0), "June 17, 2025 -\nJuly 30, 2025", 8.5, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 12 (Evaluation Basis)
        (fitz.Rect(86.0, 458.0, 168.0, 497.0), "Evaluation\nBasis", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 458.0, 539.0, 497.0), "GB/T 19686-2015 \"Rock wool thermal insulation products for buildings\"\nGB 8624-2012 \"Classification for burning behavior of building materials and products\"", 9, "helv", fitz.TEXT_ALIGN_LEFT),
        
        # Row 13 (Testing Items)
        (fitz.Rect(86.0, 497.0, 168.0, 528.0), "Testing\nItems", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 497.0, 539.0, 528.0), "Appearance, average fiber diameter, etc. (13 items in total).\nSee data pages for details.", 9.5, "helv", fitz.TEXT_ALIGN_LEFT),
        
        # Row 14 (Test Conclusion)
        (fitz.Rect(86.0, 528.0, 168.0, 650.0), "Test\nConclusion", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 528.0, 539.0, 650.0), "Based on testing, the test results of the sampled items of the inspected sample comply with the technical requirements for curtain wall rock wool boards in GB/T 19686-2015; the test results of combustion performance comply with the technical requirements for flat-shaped building materials Class A (A1) non-combustible materials (products) in GB 8624-2012.\nSee data pages for test results.", 9, "helv", fitz.TEXT_ALIGN_LEFT),
        
        # Row 15 (Notes)
        (fitz.Rect(86.0, 650.0, 168.0, 730.0), "Notes", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(168.0, 650.0, 539.0, 730.0), "", 9.5, "helv", fitz.TEXT_ALIGN_LEFT),
        
        # Signatures
        (fitz.Rect(86.0, 730.0, 250.0, 765.0), "Approved by: Mu Xiujun", 9, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(250.0, 730.0, 420.0, 765.0), "Reviewed by: Xu Shenghua", 9, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(420.0, 730.0, 545.0, 765.0), "Prepared by: Lu Chengxin,\nSun Chao", 9, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
        
        # Footer
        (fitz.Rect(86.0, 775.0, 545.0, 795.0), "Address: No.1 Guanzhuang Dongli, Chaoyang District, Beijing   Tel: 010-51167681   Postcode: 100024", 7.5, "Times-Roman", fitz.TEXT_ALIGN_CENTER)
    ]
    
    all_p3 = p3_headers + p3_cells
    for rect, text, size, font, align in all_p3:
        page3.add_redact_annot(rect, fill=(1, 1, 1))
    page3.apply_redactions()
    for rect, text, size, font, align in all_p3:
        if text:  # skip empty Notes value
            page3.insert_textbox(rect, text, fontsize=size, fontname=font, align=align, color=(0,0,0))

    # ----------------------------------------------------
    # PAGES 4 & 5 (Data Pages)
    # Page 4 = doc[3], Page 5 = doc[4]
    # Column structure from original:
    #   No:         ~86-110
    #   Test Item:  ~110-200 (main) or ~185-250 (sub)
    #   Standard:   ~250-345
    #   Result:     ~345-425
    #   Conclusion: ~425-470
    #   Test Basis: ~470-545
    # Page header at y=115, first data row at y=135, footer label at y=120
    # ----------------------------------------------------
    
    # Common header redactions for both data pages
    def make_data_page_headers(page_idx):
        """page_idx: 3 or 4 (0-indexed)"""
        page_num_display = page_idx - 1  # Page 2 or 3 of 3
        return [
            (fitz.Rect(130.0, 30.0, 490.0, 58.0), "China Building Material Test & Certification Group Co., Ltd.", 14, "Times-Bold", fitz.TEXT_ALIGN_CENTER),
            (fitz.Rect(160.0, 58.0, 460.0, 85.0), "National Center for Quality Supervision and Test of Building Materials", 10, "Times-Bold", fitz.TEXT_ALIGN_CENTER),
            (fitz.Rect(230.0, 87.0, 390.0, 115.0), "TEST REPORT", 20, "Times-Bold", fitz.TEXT_ALIGN_CENTER),
            (fitz.Rect(85.0, 115.0, 170.0, 135.0), "Report No.:", 10, "Times-Bold", fitz.TEXT_ALIGN_LEFT),
            (fitz.Rect(440.0, 115.0, 545.0, 135.0), f"Page {page_num_display} of 3", 10, "Times-Roman", fitz.TEXT_ALIGN_RIGHT),
            # Table column headers
            (fitz.Rect(86.0, 136.0, 110.0, 190.0), "No.", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
            (fitz.Rect(110.0, 136.0, 200.0, 190.0), "Testing\nItem", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
            (fitz.Rect(250.0, 136.0, 345.0, 190.0), "Standard\nRequirement\n(Rock Wool Board\nfor Curtain Wall)", 8.5, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
            (fitz.Rect(345.0, 136.0, 425.0, 190.0), "Test\nResult", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
            (fitz.Rect(425.0, 136.0, 470.0, 190.0), "Item\nConclu-\nsion", 9, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
            (fitz.Rect(470.0, 136.0, 545.0, 190.0), "Test\nBasis", 10, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
            # Footer
            (fitz.Rect(86.0, 775.0, 545.0, 795.0), "Address: No.1 Guanzhuang Dongli, Chaoyang District, Beijing   Tel: 010-51167681   Postcode: 100024", 7.5, "Times-Roman", fitz.TEXT_ALIGN_CENTER),
        ]

    # ---- PAGE 4 (doc[3]) ----
    page4 = doc[3]
    p4_redactions = make_data_page_headers(3)
    p4_redactions += [
        # Row 1: Appearance (big row, ~190-345)
        (fitz.Rect(110.0, 190.0, 200.0, 345.0), "Appearance", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(250.0, 190.0, 345.0, 345.0), "The resin shall be distributed evenly, the surface shall be flat, and there shall be no scars, stains or damage that hinder use; if there is an outer cladding, the bonding between the outer cladding and the substrate shall be flat and firm.", 8, "helv", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(345.0, 190.0, 425.0, 345.0), "The resin is distributed evenly, the surface is flat, and there are no scars, stains or damage that hinder use; no cladding.", 8, "helv", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(425.0, 190.0, 470.0, 345.0), "Comply", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 2: Average fiber diameter (~345-424)
        (fitz.Rect(110.0, 345.0, 200.0, 424.0), "Average\nfiber\ndiameter", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 345.0, 470.0, 424.0), "Comply", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 3: Shot content (~424-471)
        (fitz.Rect(110.0, 424.0, 200.0, 471.0), "Shot content\n(particle size\n> 0.25mm)", 8.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 424.0, 470.0, 471.0), "Comply", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 4: Acidity coefficient (~471-520)
        (fitz.Rect(110.0, 471.0, 200.0, 520.0), "Acidity\ncoefficient", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 471.0, 470.0, 520.0), "Comply", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 5: Thermal conductivity (~520-597)
        (fitz.Rect(110.0, 520.0, 200.0, 597.0), "Thermal\nconductivity\n(avg. temp.\n25 deg. C)", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 520.0, 470.0, 597.0), "Comply", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 6: Combustion performance (~597-760)
        # Main label
        (fitz.Rect(110.0, 597.0, 185.0, 760.0), "Combustion\nperformance\nClass A\n(A1)", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        # Sub-labels
        (fitz.Rect(185.0, 597.0, 250.0, 634.0), "Avg. furnace\ntemp. rise", 8.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(185.0, 634.0, 250.0, 672.0), "Sustained\nflaming time", 8.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(185.0, 672.0, 250.0, 705.0), "Mass loss\nrate", 8.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(185.0, 705.0, 250.0, 760.0), "Gross heat of\ncombustion", 8.5, "helv", fitz.TEXT_ALIGN_CENTER),
        # Conclusions for sub-rows
        (fitz.Rect(425.0, 597.0, 470.0, 634.0), "Comply", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 634.0, 470.0, 672.0), "Comply", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 672.0, 470.0, 705.0), "Comply", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 705.0, 470.0, 760.0), "Comply", 9, "helv", fitz.TEXT_ALIGN_CENTER),
    ]
    
    for rect, text, size, font, align in p4_redactions:
        page4.add_redact_annot(rect, fill=(1, 1, 1))
    page4.apply_redactions()
    for rect, text, size, font, align in p4_redactions:
        page4.insert_textbox(rect, text, fontsize=size, fontname=font, align=align, color=(0,0,0))

    # ---- PAGE 5 (doc[4]) ----
    page5 = doc[4]
    p5_redactions = make_data_page_headers(4)
    
    # Also need to redact the "第 3 页 共 3 页" at the top right
    p5_redactions += [
        (fitz.Rect(440.0, 115.0, 545.0, 138.0), "Page 3 of 3", 10, "Times-Roman", fitz.TEXT_ALIGN_RIGHT),
    ]
    
    p5_redactions += [
        # Row 7: Mass moisture absorption rate (~190-238)
        (fitz.Rect(110.0, 190.0, 200.0, 238.0), "Mass moisture\nabsorption rate", 8.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 190.0, 470.0, 238.0), "Comply", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 8: Hydrophobicity rate (~238-273)
        (fitz.Rect(110.0, 238.0, 200.0, 273.0), "Hydrophobicity\nrate", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 238.0, 470.0, 273.0), "Comply", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 9: Radionuclides (~273-344)
        (fitz.Rect(110.0, 273.0, 185.0, 344.0), "Radio-\nnuclides", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(185.0, 273.0, 250.0, 310.0), "Internal\nexposure\nindex IRa", 8, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(185.0, 310.0, 250.0, 344.0), "External\nexposure\nindex Ir", 8, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 273.0, 470.0, 310.0), "Comply", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 310.0, 470.0, 344.0), "Comply", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 10: Dimensional tolerance (~344-451)
        (fitz.Rect(110.0, 344.0, 185.0, 451.0), "Dimensional\ntolerance", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(185.0, 344.0, 250.0, 380.0), "Length", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(185.0, 380.0, 250.0, 415.0), "Width", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(185.0, 415.0, 250.0, 451.0), "Thickness", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 344.0, 470.0, 380.0), "Comply", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 380.0, 470.0, 415.0), "Comply", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 415.0, 470.0, 451.0), "Comply", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 11: Density (~451-521)
        (fitz.Rect(110.0, 451.0, 185.0, 521.0), "Density\n(100kg/m3)", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(185.0, 451.0, 250.0, 486.0), "Average\nvalue", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(185.0, 486.0, 250.0, 521.0), "Density\ntolerance", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 451.0, 470.0, 486.0), "Comply", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 486.0, 470.0, 521.0), "Comply", 9.5, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 12: Short-term water absorption (~521-602)
        (fitz.Rect(110.0, 521.0, 200.0, 602.0), "Short-term\nwater\nabsorption", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 521.0, 470.0, 602.0), "Comply", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Row 13: pH value (~602-660)
        (fitz.Rect(110.0, 602.0, 200.0, 660.0), "pH value of\nwater extract", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        (fitz.Rect(425.0, 602.0, 470.0, 660.0), "Comply", 10, "helv", fitz.TEXT_ALIGN_CENTER),
        # "附录 A.1" in last test basis cell
        (fitz.Rect(475.0, 636.0, 540.0, 658.0), "Appendix A.1", 9, "helv", fitz.TEXT_ALIGN_CENTER),
        
        # Bottom Notes section
        (fitz.Rect(88.0, 664.0, 140.0, 685.0), "Notes:", 14, "Helvetica-Bold", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(139.0, 666.0, 545.0, 685.0), "1. Testing location: Guanzhuang;", 12, "helv", fitz.TEXT_ALIGN_LEFT),
        (fitz.Rect(138.0, 688.0, 545.0, 725.0), "2. The results of the combustion performance test relate only to the behavior of the product specimens under the particular conditions of the test; they are not intended to be the sole criterion for assessing the potential fire hazard of the product in use.", 9, "helv", fitz.TEXT_ALIGN_LEFT),
        # Leftover Chinese "能将其..." on next line
        (fitz.Rect(88.0, 703.0, 440.0, 725.0), "", 9, "helv", fitz.TEXT_ALIGN_LEFT),
        
        # End of Report line (use plain dashes instead of em-dashes to avoid ? rendering)
        (fitz.Rect(88.0, 720.0, 545.0, 760.0), "----------- End of Report -----------", 14, "Helvetica-Bold", fitz.TEXT_ALIGN_CENTER),
    ]
    
    for rect, text, size, font, align in p5_redactions:
        page5.add_redact_annot(rect, fill=(1, 1, 1))
    page5.apply_redactions()
    for rect, text, size, font, align in p5_redactions:
        if text:
            page5.insert_textbox(rect, text, fontsize=size, fontname=font, align=align, color=(0,0,0))
            
    # ----------------------------------------------------
    # PAGE 6 (Company Introduction Profile)
    # Exact coords from inspection:
    #   Title 国检集团简介: [231.5, 106.7, 363.8, 129.6]
    #   Body text starts at y=166.5 with multiple lines at y intervals of ~32
    #   Second paragraph at y=452.5
    #   Website line at y=579.6
    # ----------------------------------------------------
    page6 = doc[5]
    p6_redactions = [
        # Title
        (fitz.Rect(190.0, 100.0, 410.0, 135.0), "CTC Group Profile", 22, "Times-Bold", fitz.TEXT_ALIGN_CENTER),
        # First paragraph (spans from y~166 to y~435)
        (fitz.Rect(80.0, 158.0, 520.0, 440.0), 
         "China Building Material Test & Certification Group Co., Ltd. (referred to as CTC, stock code 603060), through nearly seventy years of unremitting efforts and persistent pursuit, has developed into a large-scale, comprehensive, third-party inspection and certification service institution in the field of building materials and construction engineering in China. As the first A-share listed company with the prefix of \"China\" integrating inspection and certification, its branches are spread across the country, and it has more than thirty national and industry-level testing laboratories. It can provide comprehensive solutions for quality, safety, environmental protection, green development, and energy conservation for various clients, including building material manufacturers, construction engineering, decoration engineering, railway and rail transit engineering, municipal engineering, power engineering, industrial kilns, renewable resources, new energy, and home life.",
         11, "Times-Roman", fitz.TEXT_ALIGN_LEFT),
         
        # Second paragraph (from y~452 to y~563)
        (fitz.Rect(80.0, 445.0, 520.0, 570.0),
         "China Building Material Test & Certification Group Co., Ltd. always drives enterprise development with \"scientific and technological innovation\", adhering to the core philosophy of \"impartiality-oriented, serving the society\". It safeguards the enhancement of brand value for customers and the sustainable development of the industry, and contributes to the realization of national initiatives such as \"Quality-based Nation\" and \"The Belt and Road\"!",
         11, "Times-Roman", fitz.TEXT_ALIGN_LEFT),
         
        # Website line (at y~579)
        (fitz.Rect(80.0, 572.0, 520.0, 600.0),
         "For more details, please visit the company's official website: http://www.ctc.ac.cn/",
         11, "Times-Roman", fitz.TEXT_ALIGN_LEFT),
    ]
    
    for rect, text, size, font, align in p6_redactions:
        page6.add_redact_annot(rect, fill=(1, 1, 1))
    page6.apply_redactions()
    for rect, text, size, font, align in p6_redactions:
        page6.insert_textbox(rect, text, fontsize=size, fontname=font, align=align, color=(0,0,0))
        
    doc.save(output_path)
    print(f"Successfully saved translated density report to {output_path}")

translate_density("density 100K(for panel).pdf", "density 100K(for panel)_EN.pdf")
