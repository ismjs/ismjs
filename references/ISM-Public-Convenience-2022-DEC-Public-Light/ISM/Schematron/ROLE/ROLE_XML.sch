<?xml version="1.0" encoding="UTF-8"?>
<!--UNCLASSIFIED--><?ICEA master?>
<!-- Notices - Distribution Notice: 
           This document has been approved for Public Release and is available for use without restriction.
       -->
<!-- WARNING: 
    Once compiled into an XSLT the result will 
    be the aggregate classification of all the CVES 
    and included .sch files
-->
<sch:schema xmlns:sch="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2">
    <sch:ns uri="http://www.w3.org/2001/XMLSchema" prefix="xs"/>
    <sch:ns uri="urn:us:gov:ic:cve" prefix="cve"/>
    <sch:ns uri="urn:us:gov:ic:role" prefix="role"/>
    
    <sch:p xmlns:ism="urn:us:gov:ic:ism"
          class="codeDesc"
          ism:classification="U"
          ism:ownerProducer="USA">
        This is the root file for the specifications Schematron ruleset. It loads all of the required CVEs, 
        declares some variables, and includes all of the Rule .sch files.</sch:p>
    
    <!-- ************************************** -->
    <!-- * Abstract Rule and Pattern Includes * -->
    <!-- ************************************** -->
    <sch:include href="./Lib/ValidateValidationEnvSchema.sch"/>
    <sch:include href="./Lib/ValidateValidationEnvCVE.sch"/>

    <!--****************************-->
    <!-- (U) Resources  -->
    <!--****************************-->
    <sch:let name="roleC2SScopeList"
            value="document('../../CVE/ROLE/CVEnumROLEC2SScope.xml')//cve:CVE/cve:Enumeration/cve:Term/cve:Value"/>
    <sch:let name="rolePAASScopeList"
            value="document('../../CVE/ROLE/CVEnumROLEPAASScope.xml')//cve:CVE/cve:Enumeration/cve:Term/cve:Value"/>
    <sch:let name="roleEnterpriseRoleList"
            value="document('../../CVE/ROLE/CVEnumROLEEnterpriseRole.xml')//cve:CVE/cve:Enumeration/cve:Term/cve:Value"/>
    <sch:let name="roleNebulaNamedRoleList"
            value="document('../../CVE/ROLE/CVEnumROLENebulaNamedRole.xml')//cve:CVE/cve:Enumeration/cve:Term/cve:Value"/>

   <!--****************************-->
<!-- (U) ROLE Phases -->
<!--****************************-->
<!--****************************-->
<!-- (U) ROLE ID Rules -->
<!--****************************-->

<!--(U) -->
   <sch:include href="./Rules/ROLE_ID_00001.sch"/>
   <sch:include href="./Rules/ROLE_ID_00002.sch"/>

   <!--****************************-->
<!-- (U) ROLE Phases -->
<!--****************************--></sch:schema>
<!--UNCLASSIFIED-->
