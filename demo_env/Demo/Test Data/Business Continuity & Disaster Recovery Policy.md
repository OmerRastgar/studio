# PaperWorks Online Ltd. \- Business Continuity & Disaster Recovery Policy

Policy Version: 1.0  
Effective Date: \[Date\]  
Next Review Date: Annually, or after significant business changes  
Policy Owner: CEO/Manager  
BC/DR Coordinator: IT/System Administrator  
Approved By: \[CEO Name\]  
---

### 1.0 Purpose

The purpose of this Business Continuity and Disaster Recovery (BC/DR) Policy is to establish a framework and procedures to ensure the continuity of PaperWorks Online Ltd.'s critical business operations and the timely recovery of its Information Technology (IT) systems in the event of a disruptive incident. This policy aims to minimize operational, financial, and reputational damage by preparing for, responding to, and recovering from events such as cyber-attacks, system failures, data corruption, natural disasters, or prolonged service outages.

### 2.0 Scope

This policy applies to:

* All Personnel: All employees and contracted staff have roles and responsibilities as defined in this plan.  
* Critical Business Processes: Order processing, customer service, payment transactions, and inventory management.  
* Critical IT Systems: The e-commerce website, customer/order database, payment gateway integration, and internal communication systems.  
* Data: All company data, with a primary focus on customer data, financial records, and operational data necessary for business resumption.

### 3.0 Objectives

The primary objectives of this plan are:

* To Protect Human Safety: Ensure the safety of all personnel.  
* To Minimize Downtime: Restore critical business functions within predefined timeframes.  
* To Protect Assets: Safeguard physical and information assets.  
* To Maintain Reputation: Communicate effectively with customers, suppliers, and stakeholders during an incident.  
* To Ensure Compliance: Meet contractual, regulatory (GDPR), and legal obligations during and after a disruption.

Key Metrics:

* Recovery Time Objective (RTO): The maximum acceptable delay between service interruption and restoration. For critical systems (website, order processing), the RTO is 24 hours.  
* Recovery Point Objective (RPO): The maximum acceptable period of data loss. For critical data (customer orders, inventory), the RPO is 4 hours.

### 4.0 Roles and Responsibilities

* BC/DR Lead (CEO): Authorizes the declaration of a disaster, activates the plan, and has overall command. Responsible for external communications and resource allocation.  
* IT Recovery Manager (IT Admin): Executes technical recovery procedures, manages data restoration, and coordinates with third-party vendors (hosting, payment gateway). Reports recovery status to the BC/DR Lead.  
* Operations Manager (Sales Lead): Manages the manual workarounds for business processes (e.g., manual order logging if system is down), coordinates customer communications, and manages staff during the incident.  
* All Staff: Are responsible for knowing their role in the plan, following instructions from the management team, and reporting for duty as directed during a recovery scenario.

### 5.0 Plan Activation & Disaster Declaration

A disaster is defined as any event that causes a significant disruption to critical business operations, exceeding the organization's normal capacity to respond.  
Activation Triggers:

* Extended loss of e-commerce website (\>2 hours).  
* Critical data corruption or loss.  
* Cyber-attack (e.g., ransomware) affecting operational systems.  
* Physical event (fire, flood) rendering primary business location inaccessible.  
* Prolonged outage of a critical third-party service (e.g., payment gateway, hosting provider).

Procedure:

1. The incident is identified and reported to the CEO and IT Admin.  
2. The BC/DR Lead (CEO) assesses the impact and estimated duration.  
3. If recovery exceeds the RTO for critical functions, the CEO formally declares a disaster.  
4. The BC/DR Plan is activated, and the recovery team is notified via the Communication Cascade (see 7.0).

### 6.0 Recovery Strategy & Procedures

#### 6.1 Immediate Response (First 2 Hours)

* Safety First: Ensure safety of personnel.  
* Assess: Determine the nature, scope, and impact of the disruption.  
* Communicate: Activate internal communication cascade. Prepare initial holding statement for customers if needed.  
* Contain: Take steps to prevent further damage (e.g., isolate infected systems, shut down affected services).

#### 6.2 IT System Recovery

* Hosting/Website: Contact hosting provider to initiate failover to backup site or restore from last clean backup. If using a Platform-as-a-Service (e.g., Shopify), leverage their high-availability infrastructure.  
* Database Restoration:  
  * Restore the most recent verified backup from off-site/cloud storage.  
  * Apply any incremental backups to meet the RPO.  
  * Verify data integrity before bringing systems online.  
* Payment Processing: Rely on the third-party Payment Service Provider (PSP). If the primary integration fails, implement a manual payment link provided by the PSP as a temporary workaround.  
* Communications: Restore email and internal communication tools (e.g., migrate to cloud-based services if on-premise server is down).

#### 6.3 Business Process Workarounds

* Order Management: If the website is down, switch to manual order processing using a predefined template (Excel/Google Sheets) to record customer details (name, product, address, phone) taken via phone/email. Process payments via the PSP's virtual terminal.  
* Customer Service: Update website banner/ social media with status. Use personal email/mobile phones (as per contact list) to manage critical customer queries.  
* Fulfillment: Use manual pick lists generated from the manual order log.

### 7.0 Backup Policy

* Frequency: Critical systems (website files, databases) are backed up daily. Transactional data (new orders) is backed up in real-time/increments where possible.  
* Retention: Full backups are retained for 30 days. Monthly archives are kept for 12 months.  
* Storage: Backups are stored in two locations:  
  1. On-Site/Cloud Primary: For quick restoration of minor incidents.  
  2. Off-Site/Cloud Secondary: A geographically separate cloud storage provider (e.g., AWS S3 in another region) for disaster recovery.  
* Encryption: All backup data is encrypted both in transit and at rest.  
* Testing: Restoration tests are performed quarterly to verify backup integrity and the recovery procedure. Results are documented.

### 8.0 Communication Plan

* Internal: A contact list (with primary and secondary numbers/emails) for all staff is maintained by the CEO and stored both digitally (encrypted) and in hard copy off-site. Communication will use multiple channels (phone, SMS, encrypted messaging app).  
* External:  
  * Customers: Prepared statements for website and social media. Email updates via mailing list provider if available.  
  * Suppliers/Vendors: Contact key suppliers (e.g., shipping carrier, wholesaler) to inform them of potential delays.  
  * Regulators: If a data breach is involved, follow the Incident Response & Breach Notification Policy for reporting to the Data Protection Commission (GDPR).

### 9.0 Training, Testing, and Maintenance

* Training: All staff will receive basic awareness training on this plan upon hire and annually.  
* Testing: A structured table-top exercise simulating a major disruption will be conducted annually. The IT Administrator will perform technical recovery drills quarterly.  
* Plan Maintenance: This BC/DR Plan is a living document. It will be reviewed and updated annually, or after:  
  * A test or real invocation.  
  * Significant changes to business processes or IT infrastructure.  
  * Changes in personnel with key recovery roles.

### 10.0 Appendix

* A1: Contact Lists (Internal, Key Suppliers, Hosting, PSP)  
* A2: Manual Order Processing Template  
* A3: Backup and Restoration Procedure Documentation  
* A4: Hosting/PSP Service Level Agreements (SLAs) and Support Contacts

---

Plan Acknowledgment  
All personnel with assigned recovery responsibilities must read and understand this plan.  
Employee Acknowledgment  
I, \[Employee Name\], have read and understand my role and responsibilities in the PaperWorks Online Ltd. Business Continuity & Disaster Recovery Plan.  
Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
