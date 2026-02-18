// DYMO Label v8 Integration Service
// Communicates with local DYMO Web Service via the DYMO Connect Framework

declare global {
  interface Window {
    dymo?: {
      label: {
        framework: {
          init: () => Promise<void>;
          checkEnvironment: () => Promise<{
            isBrowserSupported: boolean;
            isFrameworkInstalled: boolean;
            isWebServicePresent: boolean;
            errorDetails: string;
          }>;
          getPrinters: () => Promise<Array<{
            name: string;
            printerType: string;
            isConnected: boolean;
            isLocal: boolean;
            modelName: string;
          }>>;
          printLabel: (
            printerName: string,
            printParamsXml: string,
            labelXml: string,
            labelSetXml: string
          ) => Promise<void>;
          openLabelFile: (fileName: string) => Promise<unknown>;
        };
      };
    };
  }
}

export interface DymoPrinter {
  name: string;
  modelName: string;
  isConnected: boolean;
}

export interface DymoEnvironment {
  isAvailable: boolean;
  isFrameworkInstalled: boolean;
  isWebServicePresent: boolean;
  errorDetails?: string;
}

export const LABEL_FORMATS = [
  { id: '11354', name: '11354 Multi-Purpose (57×32mm)', width: 3240, height: 1815 },
  { id: '30323', name: '30323 Shipping (54×101mm)', width: 5760, height: 2880 },
  { id: '30256', name: '30256 Large Shipping (59×102mm)', width: 5820, height: 3060 },
  { id: '30252', name: '30252 Address (28×89mm)', width: 5040, height: 1580 },
] as const;

export type LabelFormat = typeof LABEL_FORMATS[number];

/**
 * Check if DYMO framework is available and running
 */
export const checkDymoEnvironment = async (): Promise<DymoEnvironment> => {
  try {
    if (!window.dymo) {
      return {
        isAvailable: false,
        isFrameworkInstalled: false,
        isWebServicePresent: false,
        errorDetails: 'DYMO Connect Framework niet geladen',
      };
    }

    await window.dymo.label.framework.init();
    const env = await window.dymo.label.framework.checkEnvironment();

    return {
      isAvailable: env.isFrameworkInstalled && env.isWebServicePresent,
      isFrameworkInstalled: env.isFrameworkInstalled,
      isWebServicePresent: env.isWebServicePresent,
      errorDetails: env.errorDetails || undefined,
    };
  } catch (error) {
    return {
      isAvailable: false,
      isFrameworkInstalled: false,
      isWebServicePresent: false,
      errorDetails: error instanceof Error ? error.message : 'Onbekende fout',
    };
  }
};

/**
 * Get available DYMO LabelWriter printers
 */
export const getDymoPrinters = async (): Promise<DymoPrinter[]> => {
  try {
    if (!window.dymo) return [];
    
    const printers = await window.dymo.label.framework.getPrinters();
    return printers
      .filter(p => p.printerType === 'LabelWriterPrinter')
      .map(p => ({
        name: p.name,
        modelName: p.modelName,
        isConnected: p.isConnected,
      }));
  } catch {
    return [];
  }
};

/**
 * Generate DYMO label XML for a vehicle QR sticker
 */
export const generateLabelXml = (
  qrUrl: string,
  brand: string,
  model: string,
  color: string,
  licensePlate: string,
  vin: string,
  format: LabelFormat = LABEL_FORMATS[0]
): string => {
  const isSmall = format.id === '11354';
  const isCompact = format.id === '30252' || isSmall;
  const qrSize = isSmall ? 1000 : isCompact ? 800 : 1200;
  
  return `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Landscape</PaperOrientation>
  <Id>${format.id}</Id>
  <PaperName>${format.id} Label</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${format.width}" Height="${format.height}" Rx="0" Ry="0" />
  </DrawCommands>
  <ObjectInfo>
    <BarcodeObject>
      <Name>QRCode</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
      <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
      <LinkedObjectName></LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <Text>${qrUrl}</Text>
      <Type>QRCode</Type>
      <Size>${qrSize}</Size>
      <TextPosition>None</TextPosition>
      <TextFont Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
      <CheckSumFont Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
      <TextEmbedding>None</TextEmbedding>
      <ECLevel>0</ECLevel>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <QuietZonesPadding Left="0" Top="0" Right="0" Bottom="0" />
    </BarcodeObject>
    <Bounds X="200" Y="200" Width="${qrSize}" Height="${qrSize}" />
  </ObjectInfo>
  <ObjectInfo>
    <TextObject>
      <Name>BrandModel</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
      <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
      <LinkedObjectName></LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <HorizontalAlignment>Left</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>${brand} ${model}</String>
          <Attributes>
            <Font Family="Arial" Size="${isCompact ? '9' : '11'}" Bold="True" Italic="False" Underline="False" Strikeout="False" />
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="${qrSize + 400}" Y="200" Width="${format.width - qrSize - 600}" Height="400" />
  </ObjectInfo>
  <ObjectInfo>
    <TextObject>
      <Name>Color</Name>
      <ForeColor Alpha="255" Red="80" Green="80" Blue="80" />
      <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
      <LinkedObjectName></LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <HorizontalAlignment>Left</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>${color || '-'}</String>
          <Attributes>
            <Font Family="Arial" Size="${isCompact ? '8' : '9'}" Bold="False" Italic="False" Underline="False" Strikeout="False" />
            <ForeColor Alpha="255" Red="80" Green="80" Blue="80" />
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="${qrSize + 400}" Y="600" Width="${format.width - qrSize - 600}" Height="300" />
  </ObjectInfo>
  <ObjectInfo>
    <TextObject>
      <Name>LicensePlate</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
      <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
      <LinkedObjectName></LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <HorizontalAlignment>Left</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>${licensePlate || '-'}</String>
          <Attributes>
            <Font Family="Arial" Size="${isCompact ? '14' : '18'}" Bold="True" Italic="False" Underline="False" Strikeout="False" />
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="${qrSize + 400}" Y="1000" Width="${format.width - qrSize - 600}" Height="500" />
  </ObjectInfo>
  <ObjectInfo>
    <TextObject>
      <Name>VIN</Name>
      <ForeColor Alpha="255" Red="100" Green="100" Blue="100" />
      <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
      <LinkedObjectName></LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <HorizontalAlignment>Left</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>VIN: ${vin || '-'}</String>
          <Attributes>
            <Font Family="Arial" Size="${isCompact ? '6' : '7'}" Bold="False" Italic="False" Underline="False" Strikeout="False" />
            <ForeColor Alpha="255" Red="100" Green="100" Blue="100" />
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="${qrSize + 400}" Y="1600" Width="${format.width - qrSize - 600}" Height="300" />
  </ObjectInfo>
</DieCutLabel>`;
};

/**
 * Print label to DYMO printer
 */
export const printDymoLabel = async (
  printerName: string,
  labelXml: string
): Promise<void> => {
  if (!window.dymo) {
    throw new Error('DYMO framework niet beschikbaar');
  }
  
  await window.dymo.label.framework.printLabel(printerName, '', labelXml, '');
};
