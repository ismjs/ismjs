<?xml version="1.0" encoding="UTF-8"?>
<!--UNCLASSIFIED--><xsl:stylesheet xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                xmlns:saxon="http://saxon.sf.net/"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:schold="http://www.ascc.net/xml/schematron"
                xmlns:iso="http://purl.oclc.org/dsdl/schematron"
                xmlns:xhtml="http://www.w3.org/1999/xhtml"
                xmlns:usagency="urn:us:gov:ic:usagency"
                xmlns:audit="urn:us:gov:ic:audit"
                xmlns:domex="urn:us:mil:ces:metadata:domex"
                xmlns:uias="urn:us:gov:ic:uias"
                xmlns:util="urn:us:gov:ic:edh:xsl:util"
                version="2.0"><!--Implementers: please note that overriding process-prolog or process-root is 
    the preferred method for meta-stylesheets to use where possible. -->
<xsl:param name="archiveDirParameter"/>
   <xsl:param name="archiveNameParameter"/>
   <xsl:param name="fileNameParameter"/>
   <xsl:param name="fileDirParameter"/>
   <xsl:variable name="document-uri">
      <xsl:value-of select="document-uri(/)"/>
   </xsl:variable>

   <!--PHASES-->


<!--PROLOG-->
<xsl:output xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
               method="xml"
               omit-xml-declaration="no"
               standalone="yes"
               indent="yes"/>

   <!--XSD TYPES FOR XSLT2-->


<!--KEYS AND FUNCTIONS-->


<!--DEFAULT RULES-->


<!--MODE: SCHEMATRON-SELECT-FULL-PATH-->
<!--This mode can be used to generate an ugly though full XPath for locators-->
<xsl:template match="*" mode="schematron-select-full-path">
      <xsl:apply-templates select="." mode="schematron-get-full-path"/>
   </xsl:template>

   <!--MODE: SCHEMATRON-FULL-PATH-->
<!--This mode can be used to generate an ugly though full XPath for locators-->
<xsl:template match="*" mode="schematron-get-full-path">
      <xsl:apply-templates select="parent::*" mode="schematron-get-full-path"/>
      <xsl:text>/</xsl:text>
      <xsl:choose>
         <xsl:when test="namespace-uri()=''">
            <xsl:value-of select="name()"/>
         </xsl:when>
         <xsl:otherwise>
            <xsl:text>*:</xsl:text>
            <xsl:value-of select="local-name()"/>
            <xsl:text>[namespace-uri()='</xsl:text>
            <xsl:value-of select="namespace-uri()"/>
            <xsl:text>']</xsl:text>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:variable name="preceding"
                    select="count(preceding-sibling::*[local-name()=local-name(current())                                   and namespace-uri() = namespace-uri(current())])"/>
      <xsl:text>[</xsl:text>
      <xsl:value-of select="1+ $preceding"/>
      <xsl:text>]</xsl:text>
   </xsl:template>
   <xsl:template match="@*" mode="schematron-get-full-path">
      <xsl:apply-templates select="parent::*" mode="schematron-get-full-path"/>
      <xsl:text>/</xsl:text>
      <xsl:choose>
         <xsl:when test="namespace-uri()=''">@<xsl:value-of select="name()"/>
         </xsl:when>
         <xsl:otherwise>
            <xsl:text>@*[local-name()='</xsl:text>
            <xsl:value-of select="local-name()"/>
            <xsl:text>' and namespace-uri()='</xsl:text>
            <xsl:value-of select="namespace-uri()"/>
            <xsl:text>']</xsl:text>
         </xsl:otherwise>
      </xsl:choose>
   </xsl:template>

   <!--MODE: SCHEMATRON-FULL-PATH-2-->
<!--This mode can be used to generate prefixed XPath for humans-->
<xsl:template match="node() | @*" mode="schematron-get-full-path-2">
      <xsl:for-each select="ancestor-or-self::*">
         <xsl:text>/</xsl:text>
         <xsl:value-of select="name(.)"/>
         <xsl:if test="preceding-sibling::*[name(.)=name(current())]">
            <xsl:text>[</xsl:text>
            <xsl:value-of select="count(preceding-sibling::*[name(.)=name(current())])+1"/>
            <xsl:text>]</xsl:text>
         </xsl:if>
      </xsl:for-each>
      <xsl:if test="not(self::*)">
         <xsl:text/>/@<xsl:value-of select="name(.)"/>
      </xsl:if>
   </xsl:template>
   <!--MODE: SCHEMATRON-FULL-PATH-3-->
<!--This mode can be used to generate prefixed XPath for humans 
	(Top-level element has index)-->
<xsl:template match="node() | @*" mode="schematron-get-full-path-3">
      <xsl:for-each select="ancestor-or-self::*">
         <xsl:text>/</xsl:text>
         <xsl:value-of select="name(.)"/>
         <xsl:if test="parent::*">
            <xsl:text>[</xsl:text>
            <xsl:value-of select="count(preceding-sibling::*[name(.)=name(current())])+1"/>
            <xsl:text>]</xsl:text>
         </xsl:if>
      </xsl:for-each>
      <xsl:if test="not(self::*)">
         <xsl:text/>/@<xsl:value-of select="name(.)"/>
      </xsl:if>
   </xsl:template>

   <!--MODE: GENERATE-ID-FROM-PATH -->
<xsl:template match="/" mode="generate-id-from-path"/>
   <xsl:template match="text()" mode="generate-id-from-path">
      <xsl:apply-templates select="parent::*" mode="generate-id-from-path"/>
      <xsl:value-of select="concat('.text-', 1+count(preceding-sibling::text()), '-')"/>
   </xsl:template>
   <xsl:template match="comment()" mode="generate-id-from-path">
      <xsl:apply-templates select="parent::*" mode="generate-id-from-path"/>
      <xsl:value-of select="concat('.comment-', 1+count(preceding-sibling::comment()), '-')"/>
   </xsl:template>
   <xsl:template match="processing-instruction()" mode="generate-id-from-path">
      <xsl:apply-templates select="parent::*" mode="generate-id-from-path"/>
      <xsl:value-of select="concat('.processing-instruction-', 1+count(preceding-sibling::processing-instruction()), '-')"/>
   </xsl:template>
   <xsl:template match="@*" mode="generate-id-from-path">
      <xsl:apply-templates select="parent::*" mode="generate-id-from-path"/>
      <xsl:value-of select="concat('.@', name())"/>
   </xsl:template>
   <xsl:template match="*" mode="generate-id-from-path" priority="-0.5">
      <xsl:apply-templates select="parent::*" mode="generate-id-from-path"/>
      <xsl:text>.</xsl:text>
      <xsl:value-of select="concat('.',name(),'-',1+count(preceding-sibling::*[name()=name(current())]),'-')"/>
   </xsl:template>

   <!--MODE: GENERATE-ID-2 -->
<xsl:template match="/" mode="generate-id-2">U</xsl:template>
   <xsl:template match="*" mode="generate-id-2" priority="2">
      <xsl:text>U</xsl:text>
      <xsl:number level="multiple" count="*"/>
   </xsl:template>
   <xsl:template match="node()" mode="generate-id-2">
      <xsl:text>U.</xsl:text>
      <xsl:number level="multiple" count="*"/>
      <xsl:text>n</xsl:text>
      <xsl:number count="node()"/>
   </xsl:template>
   <xsl:template match="@*" mode="generate-id-2">
      <xsl:text>U.</xsl:text>
      <xsl:number level="multiple" count="*"/>
      <xsl:text>_</xsl:text>
      <xsl:value-of select="string-length(local-name(.))"/>
      <xsl:text>_</xsl:text>
      <xsl:value-of select="translate(name(),':','.')"/>
   </xsl:template>
   <!--Strip characters--><xsl:template match="text()" priority="-1"/>

   <!--SCHEMA SETUP-->
<xsl:template match="/">
      <svrl:schematron-output xmlns:svrl="http://purl.oclc.org/dsdl/svrl" title="" schemaVersion="">
         <xsl:comment>
            <xsl:value-of select="$archiveDirParameter"/>   
		 <xsl:value-of select="$archiveNameParameter"/>  
		 <xsl:value-of select="$fileNameParameter"/>  
		 <xsl:value-of select="$fileDirParameter"/>
         </xsl:comment>
         <svrl:ns-prefix-in-attribute-values uri="urn:us:gov:ic:usagency" prefix="usagency"/>
         <svrl:ns-prefix-in-attribute-values uri="urn:us:gov:ic:audit" prefix="audit"/>
         <svrl:ns-prefix-in-attribute-values uri="urn:us:mil:ces:metadata:domex" prefix="domex"/>
         <svrl:ns-prefix-in-attribute-values uri="urn:us:gov:ic:uias" prefix="uias"/>
         <svrl:ns-prefix-in-attribute-values uri="urn:us:gov:ic:edh:xsl:util" prefix="util"/>
         <svrl:ns-prefix-in-attribute-values uri="http://www.w3.org/2001/XMLSchema" prefix="xs"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">USAgency-ID-00001</xsl:attribute>
            <xsl:attribute name="name">USAgency-ID-00001</xsl:attribute>
            <svrl:text>
        [USAgency-ID-00001][Warning] usagency:CESVersion attribute SHOULD be specified as version 202207 (Version:2022-JUL) 
        with an optional extension.
    </svrl:text>
            <svrl:text>
        This rule supports extending the version identifier with an optional trailing hypen
        and up to 23 additional characters. The version must match the regular expression
        “^202207(\-.{1,23})?$
    </svrl:text>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M6"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">USAgency-ID-00002</xsl:attribute>
            <xsl:attribute name="name">USAgency-ID-00002</xsl:attribute>
            <svrl:text>
        [USAgency-ID-00002][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
        Please contact the organization for information about when this value should be updated.
    </svrl:text>
            <svrl:text>
        If AUDIT (audit:Agency, audit:HomeAgency), DOMEX (domex:primaryAgency), UIAS (uias:AdminOrganization,
        uias:AuditRoutingOrganization, uias:DutyOrganization) or USAgency (usagency:USAgency, usagency:USGOVAgency) elements 
        references "USA.OPIC", give a warning that it has been replaced by "USA.DFC".
    </svrl:text>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M7"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">USAgency-ID-00003</xsl:attribute>
            <xsl:attribute name="name">USAgency-ID-00003</xsl:attribute>
            <svrl:text>
        [USAgency-ID-00003][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
        Please contact the organization for information about when this value should be updated.
    </svrl:text>
            <svrl:text>
        If UIAS admin organization (@uias:adminOrganization) references "USA.OPIC", 
        give a warning that it has been replaced by "USA.DFC".
    </svrl:text>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M8"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">USAgency-ID-00004</xsl:attribute>
            <xsl:attribute name="name">USAgency-ID-00004</xsl:attribute>
            <svrl:text>
        [USAgency-ID-00004][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
        Please contact the organization for information about when this value should be updated.
    </svrl:text>
            <svrl:text>
        If UIAS audit routing organization (@uias:auditRoutingOrganization) references "USA.OPIC", 
        give a warning that it has been replaced by "USA.DFC".
    </svrl:text>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M9"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">USAgency-ID-00005</xsl:attribute>
            <xsl:attribute name="name">USAgency-ID-00005</xsl:attribute>
            <svrl:text>
        [USAgency-ID-00005][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
        Please contact the organization for information about when this value should be updated.
    </svrl:text>
            <svrl:text>
        If UIAS duty organization (@uias:dutyOrganization) references "USA.OPIC", 
        give a warning that it has been replaced by "USA.DFC".
    </svrl:text>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M10"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">USAgency-ID-00006</xsl:attribute>
            <xsl:attribute name="name">USAgency-ID-00006</xsl:attribute>
            <svrl:text>
        [USAgency-ID-00006][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
        Please contact the organization for information about when this value should be updated.
    </svrl:text>
            <svrl:text>
        If USAgency (@usagency:usagency) references "USA.OPIC", 
        give a warning that it has been replaced by "USA.DFC".
    </svrl:text>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M11"/>
         <svrl:active-pattern>
            <xsl:attribute name="document">
               <xsl:value-of select="document-uri(/)"/>
            </xsl:attribute>
            <xsl:attribute name="id">USAgency-ID-00007</xsl:attribute>
            <xsl:attribute name="name">USAgency-ID-00007</xsl:attribute>
            <svrl:text>
        [USAgency-ID-00007][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
        Please contact the organization for information about when this value should be updated.
    </svrl:text>
            <svrl:text>
        If USGOVAgency (@usagency:usgovagency) references "USA.OPIC", 
        give a warning that it has been replaced by "USA.DFC".
    </svrl:text>
            <xsl:apply-templates/>
         </svrl:active-pattern>
         <xsl:apply-templates select="/" mode="M12"/>
      </svrl:schematron-output>
   </xsl:template>

   <!--SCHEMATRON PATTERNS-->


<!--PATTERN USAgency-ID-00001-->


	<!--RULE USAgency-ID-00001-R1-->
<xsl:template match="*[@usagency:CESVersion]" priority="1000" mode="M6">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="*[@usagency:CESVersion]"
                       id="USAgency-ID-00001-R1"/>

		    <!--ASSERT warning-->
<xsl:choose>
         <xsl:when test="matches(@usagency:CESVersion,'^202207(\-.{1,23})?$')"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="matches(@usagency:CESVersion,'^202207(\-.{1,23})?$')">
               <xsl:attribute name="flag">warning</xsl:attribute>
               <xsl:attribute name="role">warning</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
            [USAgency-ID-00001][Warning] usagency:CESVersion attribute SHOULD be specified as version 202207 (Version:2022-JUL) 
            with an optional extension.
        </svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M6"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M6"/>
   <xsl:template match="@*|node()" priority="-2" mode="M6">
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M6"/>
   </xsl:template>

   <!--PATTERN USAgency-ID-00002-->


	<!--RULE USAgency-ID-00002-R1-->
<xsl:template match="audit:Agency | audit:HomeAgency |                                                   domex:primaryAgency |                                                   uias:AdminOrganization | uias:AuditRoutingOrganization | uias:DutyOrganization |                                                  usagency:USAgency | usagency:USGOVAgency"
                 priority="1000"
                 mode="M7">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="audit:Agency | audit:HomeAgency |                                                   domex:primaryAgency |                                                   uias:AdminOrganization | uias:AuditRoutingOrganization | uias:DutyOrganization |                                                  usagency:USAgency | usagency:USGOVAgency"
                       id="USAgency-ID-00002-R1"/>

		    <!--ASSERT warning-->
<xsl:choose>
         <xsl:when test="not(./text()='USA.OPIC')"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl" test="not(./text()='USA.OPIC')">
               <xsl:attribute name="flag">warning</xsl:attribute>
               <xsl:attribute name="role">warning</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
            [USAgency-ID-00002][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
            Please contact the organization for information about when this value should be updated.
        </svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M7"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M7"/>
   <xsl:template match="@*|node()" priority="-2" mode="M7">
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M7"/>
   </xsl:template>

   <!--PATTERN USAgency-ID-00003-->


	<!--RULE USAgency-ID-00003-R1-->
<xsl:template match="*[@uias:adminOrganization]" priority="1000" mode="M8">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="*[@uias:adminOrganization]"
                       id="USAgency-ID-00003-R1"/>

		    <!--ASSERT warning-->
<xsl:choose>
         <xsl:when test="not(./@uias:adminOrganization='USA.OPIC')"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not(./@uias:adminOrganization='USA.OPIC')">
               <xsl:attribute name="flag">warning</xsl:attribute>
               <xsl:attribute name="role">warning</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
            [USAgency-ID-00003][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
            Please contact the organization for information about when this value should be updated.
        </svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M8"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M8"/>
   <xsl:template match="@*|node()" priority="-2" mode="M8">
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M8"/>
   </xsl:template>

   <!--PATTERN USAgency-ID-00004-->


	<!--RULE USAgency-ID-00004-R1-->
<xsl:template match="*[@uias:auditRoutingOrganization]" priority="1000" mode="M9">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="*[@uias:auditRoutingOrganization]"
                       id="USAgency-ID-00004-R1"/>

		    <!--ASSERT warning-->
<xsl:choose>
         <xsl:when test="not(./@uias:auditRoutingOrganization='USA.OPIC')"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not(./@uias:auditRoutingOrganization='USA.OPIC')">
               <xsl:attribute name="flag">warning</xsl:attribute>
               <xsl:attribute name="role">warning</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
            [USAgency-ID-00004][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
            Please contact the organization for information about when this value should be updated.
        </svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M9"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M9"/>
   <xsl:template match="@*|node()" priority="-2" mode="M9">
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M9"/>
   </xsl:template>

   <!--PATTERN USAgency-ID-00005-->


	<!--RULE USAgency-ID-00005-R1-->
<xsl:template match="*[@uias:dutyOrganization]" priority="1000" mode="M10">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="*[@uias:dutyOrganization]"
                       id="USAgency-ID-00005-R1"/>

		    <!--ASSERT warning-->
<xsl:choose>
         <xsl:when test="not(./@uias:dutyOrganization='USA.OPIC')"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not(./@uias:dutyOrganization='USA.OPIC')">
               <xsl:attribute name="flag">warning</xsl:attribute>
               <xsl:attribute name="role">warning</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
            [USAgency-ID-00005][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
            Please contact the organization for information about when this value should be updated.
        </svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M10"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M10"/>
   <xsl:template match="@*|node()" priority="-2" mode="M10">
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M10"/>
   </xsl:template>

   <!--PATTERN USAgency-ID-00006-->


	<!--RULE USAgency-ID-00006-R1-->
<xsl:template match="*[@usagency:usagency]" priority="1000" mode="M11">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="*[@usagency:usagency]"
                       id="USAgency-ID-00006-R1"/>

		    <!--ASSERT warning-->
<xsl:choose>
         <xsl:when test="not(./@usagency:usagency='USA.OPIC')"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not(./@usagency:usagency='USA.OPIC')">
               <xsl:attribute name="flag">warning</xsl:attribute>
               <xsl:attribute name="role">warning</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
            [USAgency-ID-00006][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
            Please contact the organization for information about when this value should be updated.
        </svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M11"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M11"/>
   <xsl:template match="@*|node()" priority="-2" mode="M11">
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M11"/>
   </xsl:template>

   <!--PATTERN USAgency-ID-00007-->


	<!--RULE USAgency-ID-00007-R1-->
<xsl:template match="*[@usagency:usgovagency]" priority="1000" mode="M12">
      <svrl:fired-rule xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                       context="*[@usagency:usgovagency]"
                       id="USAgency-ID-00007-R1"/>

		    <!--ASSERT warning-->
<xsl:choose>
         <xsl:when test="not(./@usagency:usgovagency='USA.OPIC')"/>
         <xsl:otherwise>
            <svrl:failed-assert xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
                                test="not(./@usagency:usgovagency='USA.OPIC')">
               <xsl:attribute name="flag">warning</xsl:attribute>
               <xsl:attribute name="role">warning</xsl:attribute>
               <xsl:attribute name="location">
                  <xsl:apply-templates select="." mode="schematron-select-full-path"/>
               </xsl:attribute>
               <svrl:text>
            [USAgency-ID-00007][Warning] "USA.OPIC" has been replaced by "USA.DFC". 
            Please contact the organization for information about when this value should be updated.
        </svrl:text>
            </svrl:failed-assert>
         </xsl:otherwise>
      </xsl:choose>
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M12"/>
   </xsl:template>
   <xsl:template match="text()" priority="-1" mode="M12"/>
   <xsl:template match="@*|node()" priority="-2" mode="M12">
      <xsl:apply-templates select="*|comment()|processing-instruction()" mode="M12"/>
   </xsl:template>
</xsl:stylesheet>
<!--UNCLASSIFIED-->
