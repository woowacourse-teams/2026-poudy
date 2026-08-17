package com.poudy.offline.catalogsensory;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

final class AtomicReportPairWriter {

    private AtomicReportPairWriter() {
    }

    static void write(
            Path firstTarget,
            byte[] firstContent,
            Path secondTarget,
            byte[] secondContent)
            throws IOException {
        PreviousFile firstPrevious = PreviousFile.capture(firstTarget);
        PreviousFile secondPrevious = PreviousFile.capture(secondTarget);
        Path firstTemporary = Files.createTempFile(firstTarget.getParent(), "report-first-", ".tmp");
        Path secondTemporary = Files.createTempFile(secondTarget.getParent(), "report-second-", ".tmp");
        boolean firstMoved = false;
        boolean secondMoved = false;

        try {
            Files.write(firstTemporary, firstContent);
            Files.write(secondTemporary, secondContent);
            moveReplacing(firstTemporary, firstTarget);
            firstMoved = true;
            moveReplacing(secondTemporary, secondTarget);
            secondMoved = true;
        } catch (IOException failure) {
            IOException rollbackFailure = rollback(
                    firstTarget,
                    firstPrevious,
                    firstMoved,
                    secondTarget,
                    secondPrevious,
                    secondMoved);
            if (rollbackFailure != null) {
                failure.addSuppressed(rollbackFailure);
            }
            throw failure;
        } finally {
            Files.deleteIfExists(firstTemporary);
            Files.deleteIfExists(secondTemporary);
        }
    }

    private static IOException rollback(
            Path firstTarget,
            PreviousFile firstPrevious,
            boolean firstMoved,
            Path secondTarget,
            PreviousFile secondPrevious,
            boolean secondMoved) {
        IOException failure = null;
        try {
            if (firstMoved) {
                firstPrevious.restore(firstTarget);
            }
        } catch (IOException exception) {
            failure = exception;
        }
        try {
            if (secondMoved) {
                secondPrevious.restore(secondTarget);
            }
        } catch (IOException exception) {
            if (failure == null) {
                failure = exception;
            } else {
                failure.addSuppressed(exception);
            }
        }
        return failure;
    }

    private static void moveReplacing(Path source, Path target) throws IOException {
        try {
            Files.move(
                    source,
                    target,
                    StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private record PreviousFile(boolean existed, byte[] content) {

        private static PreviousFile capture(Path target) throws IOException {
            if (!Files.exists(target)) {
                return new PreviousFile(false, new byte[0]);
            }
            return new PreviousFile(true, Files.readAllBytes(target));
        }

        private void restore(Path target) throws IOException {
            if (!existed) {
                Files.deleteIfExists(target);
                return;
            }

            Path temporary = Files.createTempFile(target.getParent(), "report-restore-", ".tmp");
            try {
                Files.write(temporary, content);
                moveReplacing(temporary, target);
            } finally {
                Files.deleteIfExists(temporary);
            }
        }
    }
}
