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
    <sch:ns uri="urn:us:gov:ic:mn" prefix="mn"/>
    <sch:ns uri="urn:us:gov:ic:region" prefix="region"/>
    <sch:ns uri="urn:us:gov:ic:edh:xsl:util" prefix="util"/>
    <sch:ns uri="http://www.w3.org/2001/XMLSchema" prefix="xs"/>


    <!--====================-->
    <!-- (U) Universal Lets -->
    <!--====================-->

    <!-- ************************************** -->
    <!-- * Abstract Rule and Pattern Includes * -->
    <!-- ************************************** -->
    <sch:include href="Lib/AllowableRegionValue.sch"/>
    <sch:include href="Lib/AllowableIssueValue.sch"/>

   <!--****************************-->
<!-- (U) MN Phases -->
<!--****************************-->
<!--****************************-->
<!-- (U) MN ID Rules -->
<!--****************************-->

<!--(U) -->
   <sch:include href="./Rules/MN_ID_00001.sch"/>

   <!--****************************-->
<!-- (U) MN Phases -->
<!--****************************--></sch:schema>
<!--UNCLASSIFIED-->
