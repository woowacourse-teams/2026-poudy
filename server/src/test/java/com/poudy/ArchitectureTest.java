package com.poudy;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "com.poudy", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    @ArchTest
    static final ArchRule DOMAIN_DOES_NOT_DEPEND_ON_OUTER_LAYERS = noClasses()
        .that()
        .resideInAPackage("..domain..")
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage("..controller..", "..service..", "..repository..")
        .because("도메인 규칙은 전송, 유스케이스, 저장소 구현과 독립적이어야 한다");

    @ArchTest
    static final ArchRule DOMAIN_DOES_NOT_DEPEND_ON_FRAMEWORKS = noClasses()
        .that()
        .resideInAPackage("..domain..")
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage(
            "org.springframework..",
            "jakarta..",
            "software.amazon.awssdk..",
            "com.fasterxml.jackson..",
            "tools.jackson.."
        )
        .because("도메인 모델은 프레임워크 없이 실행하고 검증할 수 있어야 한다");

    @ArchTest
    static final ArchRule INNER_LAYERS_DO_NOT_DEPEND_ON_CONTROLLERS = noClasses()
        .that()
        .resideInAnyPackage("..domain..", "..service..")
        .should()
        .dependOnClassesThat()
        .resideInAPackage("..controller..")
        .because("도메인과 유스케이스는 HTTP 전송 모델과 독립적이어야 한다");
}
