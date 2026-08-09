<?xml version="1.0" encoding="UTF-8"?>
<?ICEA pattern?>
<!-- Notices - Distribution Notice: 
           This document has been approved for Public Release and is available for use without restriction.
       -->
<sch:pattern xmlns:sch="http://purl.oclc.org/dsdl/schematron" xmlns:ism="urn:us:gov:ic:ism" id="USAgency-ID-00002">
    <sch:p class="ruleText" ism:classification="U" ism:ownerProducer="USA">
        [USAgency-ID-00002][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
        Please contact the organization for information about when this value should be updated.
    </sch:p>
    <sch:p class="codeDesc" ism:classification="U" ism:ownerProducer="USA">
        If AUDIT (audit:Agency, audit:HomeAgency), DOMEX (domex:primaryAgency), UIAS (uias:AdminOrganization,
        uias:AuditRoutingOrganization, uias:DutyOrganization) or USAgency (usagency:USAgency, usagency:USGOVAgency) elements 
        references "USA.OPIC", give a warning that it has been replaced by "USA.DFC".
    </sch:p>
    <sch:rule id="USAgency-ID-00002-R1" context="audit:Agency | audit:HomeAgency | 
                                                 domex:primaryAgency | 
                                                 uias:AdminOrganization | uias:AuditRoutingOrganization | uias:DutyOrganization |
                                                 usagency:USAgency | usagency:USGOVAgency">
        <sch:assert test="not(./text()='USA.OPIC')" flag="warning" role="warning">
            [USAgency-ID-00002][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
            Please contact the organization for information about when this value should be updated.
        </sch:assert>
    </sch:rule>
</sch:pattern>