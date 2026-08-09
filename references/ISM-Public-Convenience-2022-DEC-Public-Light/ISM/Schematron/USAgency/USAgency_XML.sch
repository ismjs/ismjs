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
    <sch:ns uri="urn:us:gov:ic:usagency" prefix="usagency"/>
    <sch:ns uri="urn:us:gov:ic:audit" prefix="audit"/>
    <sch:ns uri="urn:us:mil:ces:metadata:domex" prefix="domex"/>
    <sch:ns uri="urn:us:gov:ic:uias" prefix="uias"/>
    <sch:ns uri="urn:us:gov:ic:edh:xsl:util" prefix="util"/>
    <sch:ns uri="http://www.w3.org/2001/XMLSchema" prefix="xs"/>

    <!--====================-->
    <!-- (U) Universal Lets -->
    <!--====================-->

    <!-- ************************************** -->
    <!-- * Abstract Rule and Pattern Includes * -->
    <!-- ************************************** -->
    <sch:include href="Lib/AllowableUSAgencyValue.sch"/>

   <!--****************************-->
<!-- (U) USAgency Phases -->
<!--****************************-->
<!--****************************-->
<!-- (U) USAgency ID Rules -->
<!--****************************-->

<!--(U) -->
   <sch:include href="./Rules/USAgency_ID_00001.sch"/>
   <sch:include href="./Rules/USAgency_ID_00002.sch"/>
   <sch:include href="./Rules/USAgency_ID_00003.sch"/>
   <sch:include href="./Rules/USAgency_ID_00004.sch"/>
   <sch:include href="./Rules/USAgency_ID_00005.sch"/>
   <sch:include href="./Rules/USAgency_ID_00006.sch"/>
   <sch:include href="./Rules/USAgency_ID_00007.sch"/>

   <!--****************************-->
<!-- (U) USAgency Phases -->
<!--****************************--></sch:schema>
<!--UNCLASSIFIED-->
